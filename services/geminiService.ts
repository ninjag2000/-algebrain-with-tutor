import { TranslationResult, ScanMode, VerificationResult } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY (OpenRouter) environment variable not set. Set OPENROUTER_API_KEY in .env.local");
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TEXT_MODEL = "google/gemini-2.0-flash-001";
const VISION_MODEL = "google/gemini-2.0-flash-001";

type ImagePart = { type: "image_url"; image_url: { url: string } };
type TextContentPart = { type: "text"; text: string };
type MessagePart =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "user"; content: (TextContentPart | ImagePart)[] };

async function openRouterChat(params: {
  model: string;
  messages: MessagePart[];
  temperature?: number;
  response_format?: { type: "json_object" };
}): Promise<string> {
  const key = API_KEY;
  if (!key || key === "undefined" || key === "") {
    console.error("OpenRouter: API_KEY is missing. Set OPENROUTER_API_KEY in .env.local and rebuild.");
    throw new Error("API key not set. Set OPENROUTER_API_KEY in .env.local and run: npm run build && npx cap sync android");
  }
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: params.temperature ?? 0.3,
      ...(params.response_format && { response_format: params.response_format }),
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    let detail = bodyText;
    try {
      const errJson = JSON.parse(bodyText);
      detail = errJson?.error?.message || errJson?.message || bodyText;
    } catch (_) {}
    console.error("OpenRouter error", res.status, detail);
    throw new Error(`OpenRouter ${res.status}: ${detail}`);
  }
  let data: any;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error("Invalid JSON in OpenRouter response");
  }
  const content = data.choices?.[0]?.message?.content;
  if (content == null) throw new Error("No content in OpenRouter response");
  return typeof content === "string" ? content : String(content);
}

/**
 * Standardizes API errors into user-friendly translation keys.
 */
const getApiErrorMessage = (error: any, defaultKey: string): string => {
    console.error("AI API Error:", error);
    if (!error) return defaultKey;
    const errorMessage = (error?.message || "").toLowerCase();
    
    if (errorMessage.includes('region not supported')) return "error.unsupportedRegion";
    if (errorMessage.includes('api_key') || errorMessage.includes('401') || errorMessage.includes('invalid_key')) return "error.apiKey";
    if (errorMessage.includes('403') || errorMessage.includes('permission_denied')) return "error.apiKey";
    if (errorMessage.includes('safety') || errorMessage.includes('finish_reason_safety') || errorMessage.includes('blocked_by_safety')) return "error.safety";
    if (errorMessage.includes('recitation') || errorMessage.includes('copyright')) return "error.copyright";
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('failed to fetch') || errorMessage.includes('timeout')) return "error.network";
    if (errorMessage.includes('resource exhausted')) return "error.quotaExceeded";
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) return "error.rateLimit";
    if (errorMessage.includes('overloaded') || errorMessage.includes('503') || errorMessage.includes('504') || errorMessage.includes('internal error')) return "error.overloaded";
    if (errorMessage.includes('context') || errorMessage.includes('token')) return "error.contextExceeded";
    if (errorMessage.includes('no content') || errorMessage.includes('invalid json')) return "error.chatFail";

    return defaultKey;
};

export const verifySolution = async (problem: string, userAnswer: string, lang: string): Promise<Omit<VerificationResult, 'userAnswer'>> => {
    try {
        const prompt = `
            TASK: You are an AI Math Tutor. Your task is to verify a student's answer to a math problem.
            PROBLEM: "${problem}"
            STUDENT'S ANSWER: "${userAnswer}"

            INSTRUCTIONS:
            1. First, solve the problem internally to determine the correct answer.
            2. Compare the student's answer to the correct answer. The student's answer might be a single number, an expression, or a full equation (e.g., x=5). Be flexible with formatting.
            3. If the student's answer is mathematically equivalent to the correct answer, respond with a JSON object: {"isCorrect": true, "feedback": "Great job! That's exactly right."}. You can vary the positive feedback slightly (e.g., "Perfect!", "You nailed it!").
            4. If the student's answer is incorrect, identify the likely mistake.
            5. Provide a helpful and encouraging feedback hint that guides the student to find their mistake, but DO NOT give the correct answer or the full solution. For example: "You're on the right track, but it looks like there might be a small error during the distribution step. Could you double-check your signs?" or "That's a good attempt! The final number seems a bit off. How did you handle the fraction in the second term?"
            6. If the student's answer is incorrect, respond with a JSON object: {"isCorrect": false, "feedback": "Your helpful hint here."}
            7. Provide the entire response in the specified language: ${lang}.
            8. Your output MUST be a strictly valid JSON object with the keys "isCorrect" (boolean) and "feedback" (string).
        `;

        const text = await openRouterChat({
            model: TEXT_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(text);
        return {
            isCorrect: parsed.isCorrect,
            feedback: parsed.feedback,
        };
    } catch (error) {
        return {
            isCorrect: false,
            feedback: getApiErrorMessage(error, "error.solutionFail"),
        }
    }
};

export const getStepExplanation = async (
    problem: string,
    solution: string,
    stepContent: string,
    lang: string
): Promise<string> => {
    try {
        const prompt = `
            TASK: Explain the logical reasoning behind a specific step in a math solution.
            FULL PROBLEM: "${problem}"
            FULL SOLUTION: "${solution}"
            SPECIFIC STEP TO EXPLAIN: "${stepContent}"

            INSTRUCTIONS:
            1.  Focus ONLY on the SPECIFIC STEP provided.
            2.  Explain the "why," not just the "what." What is the mathematical goal of this action?
            3.  What rule, theorem, or property allows this step to be taken?
            4.  Keep the explanation concise and easy for a high school student to understand.
            5.  Provide the response in ${lang}.
            6.  Do not wrap the output in JSON or markdown. Return only the plain text explanation.
        `;

        const text = await openRouterChat({
            model: TEXT_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
        });
        return text || "error.noResponse";
    } catch (error) {
        return getApiErrorMessage(error, "error.solutionFail");
    }
};

export const getExplanationForSolution = async (
  problem: string,
  solution: string,
  level: 'detailed' | 'advanced',
  lang: string
): Promise<string> => {
  try {
    let prompt = '';
    if (level === 'detailed') {
      prompt = `
        TASK: Explain the methodology for solving a math problem.
        PROBLEM: "${problem}"
        SOLUTION_STEPS: "${solution}"

        INSTRUCTIONS:
        1. Analyze the problem and the provided solution steps.
        2. Explain the overall strategy used. What is the goal of these steps?
        3. For each major step in the solution, briefly explain WHY that step is taken (the reasoning), not just WHAT is done.
        4. Keep the explanation clear, concise, and easy for a student to understand. Focus on the logic flow.
        5. Provide the explanation in ${lang}.
        6. Do not wrap the output in JSON or markdown. Just return the plain text explanation.
      `;
    } else {
      prompt = `
        TASK: Provide an advanced, in-depth explanation of the methodology for solving a math problem.
        PROBLEM: "${problem}"
        SOLUTION_STEPS: "${solution}"

        INSTRUCTIONS:
        1. Briefly state the primary method used in the solution.
        2. Discuss the underlying mathematical concepts or theorems that justify this method. (e.g., if using the quadratic formula, mention its derivation from completing the square).
        3. Mention one or two alternative methods that could have been used to solve the problem, and briefly compare them (e.g., factoring vs. quadratic formula).
        4. Point out any common pitfalls or tricky parts in this type of problem that students should watch out for.
        5. Provide this advanced explanation in ${lang}.
        6. Do not wrap the output in JSON or markdown. Just return the plain text explanation.
      `;
    }

    const text = await openRouterChat({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    return text || "error.noResponse";
  } catch (error) {
    return getApiErrorMessage(error, "error.solutionFail");
  }
};

/** Результат авто-режима: модель сама определяет тип задачи и возвращает тип + решение */
export type AutoSolveResult = { type: ScanMode; problem: string; solution: string };

export const solveFromImageAuto = async (
  base64Image: string,
  mimeType: string,
  lang: string,
  targetLang: string = 'ru'
): Promise<AutoSolveResult> => {
  try {
    const systemRole = `TASK: Look at the image and determine what kind of task it contains. Then solve it appropriately.

TYPES (choose exactly one):
- "math": printed equation, algebra, calculus, geometry — transcribe and solve step by step.
- "handwritten": handwritten math — transcribe carefully and solve.
- "graph": graph or plot — analyze function, intercepts, equation.
- "translate": text in a foreign language that should be translated — extract and translate to ${targetLang}.
- "spelling": text with possible grammar/spelling errors — extract and correct.
- "general": any other question (test question, fact, explanation) — extract question and give a clear answer.

RULES:
1. Decide the type from the image content.
2. For math/handwritten/graph: use math notation (^(exponent), frac{}{}, √(), etc.). Use "### Step N" or "### Шаг N" for solution steps.
3. For translate: return in "problem" the original text, in "solution" the translation to ${targetLang}.
4. For spelling: "problem" = original text, "solution" = corrected text.
5. For general: "problem" = the question, "solution" = detailed answer.
6. If the image is empty or unreadable, set "type" to "math" and "problem" to "no_problem_detected", "solution" to "".

Respond in ${lang}. Output a strictly valid JSON: { "type": "<one of: math|handwritten|graph|translate|spelling|general">", "problem": "<string>", "solution": "<string>" }.`;

    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    const text = await openRouterChat({
      model: VISION_MODEL,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: systemRole },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(text);
    const type = (["math", "translate", "spelling", "general", "graph", "handwritten"] as const).includes(parsed.type) ? parsed.type : "math";
    return {
      type,
      problem: parsed.problem ?? "Could not identify problem.",
      solution: parsed.solution ?? "Could not generate solution."
    };
  } catch (error) {
    return {
      type: "math",
      problem: "error.title",
      solution: getApiErrorMessage(error, "error.solveFail")
    };
  }
};

export const solveMathProblemFromImage = async (base64Image: string, mimeType: string, lang: string, mode: ScanMode | 'graph' | 'handwritten' = 'math'): Promise<{problem: string; solution: string}> => {
  try {
    let instruction = "";
    let systemRole = "TASK: Extract and solve the mathematical problem shown in this cropped image.";
    
    switch(mode) {
      case 'graph':
        systemRole = `TASK: Analyze the graph in the image. Identify its function, intercepts, and key properties.`;
        instruction = `REASONING STEPS:
1. Identify the type of graph (e.g., linear, quadratic, exponential).
2. Extract key points like x-intercepts, y-intercepts, vertex, and asymptotes.
3. Determine the equation of the function shown in the graph.
4. Provide a step-by-step analysis of the graph's properties.
5. Output the identified function or properties as the 'problem'.
6. Output the detailed analysis as the 'solution'.`;
        break;
      case 'handwritten':
        systemRole = `TASK: Solve the handwritten math problem in this image. Pay close attention to character shapes as it is not printed text.`;
        instruction = `REASONING STEPS:
1. Carefully extract all handwritten mathematical operators, numbers, and variables with high precision.
2. Interpret the extracted characters to form a valid mathematical problem.
3. Provide a detailed step-by-step solution for the interpreted problem.`;
        break;
      case 'spelling':
        systemRole = `TASK: Extract text from this image and check it for grammar, spelling, and punctuation errors.`;
        instruction = `REASONING STEPS:
1. Extract ALL text from the image with 100% accuracy.
2. Analyze the extracted text for grammar, spelling, and style.
3. Correct all identified errors to produce a clean, professional version of the text.
4. Output the original extracted text in the 'problem' field.
5. Output the corrected, error-free text in the 'solution' field.`;
        break;
      case 'general':
        systemRole = `TASK: Find the question on the image and provide a correct, detailed answer.`;
        instruction = `REASONING STEPS:
1. Identify and extract the main question or task from the image (could be a test question, a textbook excerpt, or a handwritten note).
2. Research or calculate the correct answer using broad knowledge across all subjects (History, Science, Literature, etc.).
3. If it's a multiple-choice question, specify which option is correct and why.
4. Provide a clear, detailed explanation of the answer.
5. Output the extracted question in the 'problem' field.
6. Output the detailed answer and explanation in the 'solution' field.`;
        break;
      case 'math':
      default:
        instruction = `REASONING STEPS:
1. Transcribe the math problem exactly as shown, preserving fractions, exponents (e.g., x²), and special operators.
2. If the expression is complex, break it down logically.
3. Provide a detailed step-by-step solution for ANY type of math (algebra, equations, inequalities, calculus, geometry, etc.). For each logical step you MUST use a heading: "### Step N" or "### Шаг N" (e.g. ### Step 1, ### Step 2) so the solution is clearly split into steps.`;
        break;
    }

    const textContent = `${systemRole}
${instruction}

CONTEXT: The user has precisely cropped this image to contain only the relevant mathematical or text content. 

STRICT FORMATTING RULE: 
- Use double asterisks (**) ONLY for mathematical formulas, equations, or standalone variables (e.g., **x + 2 = 5**). 
- DO NOT wrap natural language sentences, step descriptions, or regular text in double asterisks. 
- Example of WRONG: **Multiply both sides by 2.**
- Example of CORRECT: Multiply both sides by 2: **2 * x = 10**

STRICT VALIDATION: If the image does not contain any clearly identifiable text, math problem, graph, or question related to the selected mode, set the 'problem' field exactly to "no_problem_detected". 

Provide your final response in ${lang}. 
Format the output as a strictly valid JSON object with two keys: 'problem' and 'solution'. 
The 'problem' key should contain the identified problem, original text, or description as a single-line string. 
The 'solution' key should contain the detailed solution or corrected text as a string formatted with markdown. 

For all mathematical formulas (if any), use this custom text notation: 
- '^(exponent)' (e.g., x^(2))
- '√[degree](radicand)' (e.g., √[3](8))
- '√(radicand)' for square roots
- 'frac{numerator}{denominator}' for fractions
- 'system{eq1;eq2}' for systems
- 'mixfrac{whole}{numerator}{denominator}' for mixed fractions. 

You MUST use '###' for step headings (e.g. ### Step 1, ### Step 2 or ### Шаг 1, ### Шаг 2) so the solution is always split into clear steps for any problem type.`;

    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    const text = await openRouterChat({
      model: VISION_MODEL,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: textContent },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(text);
    return {
      problem: parsed.problem || "Could not identify problem.",
      solution: parsed.solution || "Could not generate solution."
    };
  } catch (error) {
    return {
        problem: "error.title",
        solution: getApiErrorMessage(error, "error.solveFail")
    };
  }
};

export const solveMathProblemFromText = async (expression: string, lang: string): Promise<string> => {
  try {
    const prompt = `Solve the following mathematical problem: "${expression}". You MUST provide a step-by-step solution in ${lang} for ANY type of problem (algebra, equations, inequalities, calculus, geometry, word problems, etc.). Format using markdown. For each logical step, start a new section with a heading: "### Step N" or "### Шаг N" (e.g. ### Step 1, ### Step 2). For all mathematical formulas use: '^(exponent)', '√[degree](radicand)', 'frac{numerator}{denominator}', etc. Enclose ONLY formulas and math expressions within double asterisks (**). DO NOT wrap regular words or sentences in double asterisks. Always use '###' for step headings so the solution is clearly split into steps.`;
    
    const text = await openRouterChat({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });
    return text || "error.solutionFail";
  } catch (error) {
    return getApiErrorMessage(error, "error.solutionFailText");
  }
};

export const getSimilarQuestions = async (problem: string, lang: string): Promise<string> => {
  try {
    const prompt = `Based on this mathematical problem: "${problem}", generate 2-3 similar but different word problems (like scenarios with objects, fruits, etc.). For each problem, provide:
1. A short title (e.g., Пример 1).
2. A short text description of the scenario.
3. The mathematical expression: 'Выражение: ...'.
4. A step-by-step solution: 'Решение: ...'.
5. The final answer: 'Ответ: ...'.

Provide the response in ${lang}. Format using markdown with clear headings (e.g., ### Пример 1). Use the custom notation for math formulas if needed: '^(exponent)', 'frac{numerator}{denominator}', etc. Enclose ONLY math formulas and expressions in double asterisks (**).`;
    
    const text = await openRouterChat({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    return text || "error.noResponse";
  } catch (error) {
    return getApiErrorMessage(error, "error.solutionFail");
  }
};

export const getChatResponse = async (prompt: string, lang: string, isHomeworkMode: boolean): Promise<string> => {
    try {
        let systemInstruction = "You are a helpful and friendly AI assistant.";
        let fullPrompt = `User's question: "${prompt}"`;
        let response_format: { type: "json_object" } | undefined = undefined;

        if (isHomeworkMode) {
            systemInstruction = `You are a Socratic tutor. Your primary goal is to help the user solve problems on their own by guiding them, not by giving answers.`;
            fullPrompt = `
                User's question: "${prompt}"
                Your response language must be: ${lang}.

                TASK:
                1. Analyze the user's question.
                2. If the user's question is a direct request to solve a specific, self-contained mathematical problem (e.g., "solve 2x+5=10", "what is x in x^2-4=0?", "x^2+5x+6=0?"), then your task is to make them solve it first. Respond ONLY with a single, strictly valid JSON object in this exact format:
                   {
                     "action": "request_user_solution",
                     "problem": "EXTRACTED_PROBLEM_EXPRESSION_IN_CUSTOM_NOTATION",
                     "prompt_message": "That's a good problem to work on. Before we break it down, what do you think the solution is? Enter your answer."
                   }
                3. If the user's question is conceptual, a request for a hint, a general question about a topic, or they are just chatting (e.g., "what is the quadratic formula?", "I'm stuck on this step", "how do I start?", "Thanks!"), then respond with a guiding Socratic question. Respond ONLY with a single, strictly valid JSON object in this exact format:
                   {
                     "action": "socratic_guidance",
                     "guidance": "Your Socratic question here. NEVER give the direct answer."
                   }
                
                IMPORTANT FORMATTING: For any math in your guidance text, you MUST enclose it in double asterisks, e.g., **x^(2)**.
            `;
            response_format = { type: "json_object" };
        } else {
             fullPrompt = `User's question: "${prompt}".

                IMPORTANT INSTRUCTION: For any mathematical formulas, equations, or variables, you MUST enclose them in double asterisks.
                For example, instead of writing x^2 + 5x + 6 = 0, you MUST write **x^(2) + 5x + 6 = 0**.
                Another example: instead of 'the value of pi is 3.14', write 'the value of **\\pi** is **3.14**'.
                This applies to single variables like **x** as well.`;
        }
        
        const text = await openRouterChat({
            model: TEXT_MODEL,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: fullPrompt },
            ],
            temperature: isHomeworkMode ? 0.6 : 0.4,
            ...(response_format && { response_format }),
        });

        return text || "error.noResponse";
    } catch (error) {
        return getApiErrorMessage(error, "error.chatFail");
    }
};

export const getSmartProgressInsight = async (
    lastQuestion: string,
    lang: string
): Promise<{ skill: string; insight: string }> => {
    try {
        const prompt = `
            TASK: Analyze the user's last math question and provide a learning insight.
            USER'S QUESTION: "${lastQuestion}"

            INSTRUCTIONS:
            1. Identify the primary mathematical skill or topic involved (e.g., "Quadratic Equations", "Factoring Trinomials", "Linear Systems"). Keep it concise.
            2. Generate a short, positive, and encouraging insight about the user's learning based on this type of question. It should feel personal and motivating.
            3. Provide the response in ${lang}.
            4. Format the output as a strictly valid JSON object with two keys: "skill" (string) and "insight" (string).
            5. Example output: {"skill": "Quadratic Equations", "insight": "You're tackling core algebra concepts well. Keep it up!"}
        `;

        const text = await openRouterChat({
            model: TEXT_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" },
        });
        
        const parsed = JSON.parse(text);
        return {
            skill: parsed.skill || "Math Skills",
            insight: parsed.insight || "You're making great progress!"
        };
    } catch (error) {
        console.error("AI Insight Error:", error);
        return { skill: "Problem Solving", insight: "Every question makes your brain stronger!" };
    }
};

export const translateText = async (text: string | null, sourceLang: string, targetLang: string, image: { base64: string; mimeType: string } | null = null): Promise<TranslationResult> => {
  try {
    const fromClause = sourceLang === 'auto' ? 'the detected language' : `from ${sourceLang}`;
    let textPartContent = '';
    let modelToUse = TEXT_MODEL;

    if (image) {
      modelToUse = VISION_MODEL;
      textPartContent = `First, accurately extract all visible text from the provided image. `;
      if (text) {
        textPartContent += `Combine it with the following text: "${text}". `;
      }
      textPartContent += `Then, translate the combined extracted text ${fromClause} to ${targetLang}.`;
    } else if (text) {
      textPartContent = `Translate the following text ${fromClause} to ${targetLang}: "${text}"`;
    } else {
      return { mainTranslation: getApiErrorMessage(null, "error.noInput") };
    }

    textPartContent += `\n\nRespond ONLY with a strictly valid JSON object containing these keys: 
"mainTranslation" (string, the translated text), 
"extractedSourceText" (string, the original text that was extracted from the image or provided in the input, before translation), 
"alternatives" (array of strings, optional alternative translations), 
"definition" (string, optional definition of a key term in the source text), 
"detectedLanguage" (string, the native name of the language you detected from the source text).`;

    if (image) {
      const imageUrl = `data:${image.mimeType};base64,${image.base64}`;
      const textResp = await openRouterChat({
        model: modelToUse,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: textPartContent },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        }],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(textResp);
      return {
        mainTranslation: parsed.mainTranslation || "Could not translate.",
        alternatives: parsed.alternatives || [],
        definition: parsed.definition || "",
        detectedLanguage: parsed.detectedLanguage || undefined,
        extractedSourceText: parsed.extractedSourceText || text || ""
      };
    }

    const textResp = await openRouterChat({
      model: modelToUse,
      messages: [{ role: "user", content: textPartContent }],
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(textResp);
    return {
      mainTranslation: parsed.mainTranslation || "Could not translate.",
      alternatives: parsed.alternatives || [],
      definition: parsed.definition || "",
      detectedLanguage: parsed.detectedLanguage || undefined,
      extractedSourceText: parsed.extractedSourceText || text || ""
    };
  } catch (error) {
    return { 
        mainTranslation: getApiErrorMessage(error, "error.translationFail"),
    };
  }
};

export const checkGrammar = async (text: string, lang: string, image: { base64: string; mimeType: string } | null = null): Promise<string> => {
  try {
    const langName = lang === 'auto' ? 'the detected language' : lang;
    let textPartContent = '';
    let modelToUse = TEXT_MODEL;

    if (image) {
      modelToUse = VISION_MODEL;
      textPartContent = `First, extract any text from the provided image. `;
      if (text) {
        textPartContent += `Combine it with the following text: "${text}". `;
      }
      textPartContent += `Finally, correct the grammar, spelling, and punctuation of the combined text, which is in ${langName}.`;
    } else {
      textPartContent = `Correct the grammar, spelling, and punctuation in the following text, which is in ${langName}: "${text}"`;
    }

    textPartContent += `\n\nYour response should ONLY be the corrected text.`;

    if (image) {
      const imageUrl = `data:${image.mimeType};base64,${image.base64}`;
      const textResp = await openRouterChat({
        model: modelToUse,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: textPartContent },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        }],
      });
      return textResp || "error.noResponse";
    }

    const textResp = await openRouterChat({
      model: modelToUse,
      messages: [{ role: "user", content: textPartContent }],
    });
    return textResp || "error.noResponse";
  } catch (error) {
    return getApiErrorMessage(error, "error.grammarCheckFail");
  }
};

export const getBookSummary = async (title: string, analysisType: string, lang: string): Promise<string> => {
  try {
    const prompt = `Summarize or analyze "${title}". Type: ${analysisType}. Lang: ${lang}. Use professional markdown.`;
    const text = await openRouterChat({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    return text || "error.noResponse";
  } catch (error) {
    return getApiErrorMessage(error, "error.summaryFail");
  }
};

export const analyzeText = async (
  mode: 'summarize' | 'keywords',
  text: string,
  lang: string,
  fileContent: string | null
): Promise<string> => {
  try {
    const combinedText = text + (fileContent ? `\n\n${fileContent}` : '');
    const prompt = `${mode === 'summarize' ? 'Summarize' : 'Extract keywords'} in ${lang}: "${combinedText}"`;
    const textResp = await openRouterChat({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    return textResp || "error.noResponse";
  } catch (error) {
    return getApiErrorMessage(error, "error.summaryFail");
  }
};

export const summarizeWebSource = async (
  url: string,
  lang: string,
): Promise<string> => {
  try {
    const prompt = `Summarize content from ${url} in ${lang}.`;
    const text = await openRouterChat({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    return text || "error.noResponse";
  } catch (error) {
    return getApiErrorMessage(error, "error.summaryFail");
  }
};

export const refineText = async (
  text: string,
  mode: 'improve' | 'rephrase' | 'simplify' | 'continue' | 'shorten' | 'expand',
  lang: string,
  options: any
): Promise<string> => {
  try {
    const prompt = `Refine text (${mode}) in ${lang}: "${text}"`;
    if (options.image) {
      const imageUrl = `data:${options.image.mimeType};base64,${options.image.base64}`;
      const textResp = await openRouterChat({
        model: VISION_MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        }],
      });
      return textResp || "error.noResponse";
    }
    const textResp = await openRouterChat({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    return textResp || "error.noResponse";
  } catch (error) {
    return getApiErrorMessage(error, "error.essayFail");
  }
};

export const writeEssay = async (
  topic: string,
  mode: string,
  lang: string,
  options: any
): Promise<string> => {
  try {
    const prompt = `Write ${mode} on ${topic} in ${lang}.`;
    if (options.image) {
      const imageUrl = `data:${options.image.mimeType};base64,${options.image.base64}`;
      const textResp = await openRouterChat({
        model: VISION_MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        }],
      });
      return textResp || "error.noResponse";
    }
    const textResp = await openRouterChat({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
    return textResp || "error.noResponse";
  } catch (error) {
    return getApiErrorMessage(error, "error.essayFail");
  }
};
