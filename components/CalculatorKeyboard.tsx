import React, { useState, useRef } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface KeyboardProps {
    onKeyPress: (key: string) => void;
    toggleKeyboard: () => void;
    onCalculate: () => void;
    isCalculating: boolean;
}

const CalculatorKeyboard: React.FC<KeyboardProps> = ({ onKeyPress, toggleKeyboard, onCalculate, isCalculating }) => {
    const [activeMenu, setActiveMenu] = useState<'power' | 'root' | 'fraction' | 'decimal' | null>(null);
    const timerRef = useRef<number | null>(null);
    const { t } = useLocalization();

    const handlePressStart = (menu: 'power' | 'root' | 'fraction' | 'decimal') => {
        timerRef.current = window.setTimeout(() => {
            setActiveMenu(menu);
            timerRef.current = null;
        }, 500);
    };

    const handlePressEnd = (defaultKey: string) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    /** Короткое нажатие зелёной кнопки (без открытия меню): вызываем по click, чтобы работало и на тач-устройствах. */
    const handlePowerShortPress = () => {
        if (!activeMenu) onKeyPress('xⁿ');
    };
    const handleRootShortPress = () => {
        if (!activeMenu) onKeyPress('ⁿ√');
    };
    const handleFractionShortPress = () => {
        if (!activeMenu) onKeyPress('a/b');
    };
    const handleDecimalShortPress = () => {
        if (!activeMenu) onKeyPress('.');
    };

    const handleOptionClick = (key: string) => {
        onKeyPress(key);
        setActiveMenu(null);
    };

    const handlePress = (key: string) => {
       onKeyPress(key);
    };
    
    const Button: React.FC<{ value: string; className?: string; children: React.ReactNode; ariaLabel?: string }> = ({ value, className, children, ariaLabel }) => (
        <button onClick={() => handlePress(value)} aria-label={ariaLabel || value} className={`h-14 rounded-lg flex items-center justify-center text-2xl transition-colors ${className}`}>
            {children}
        </button>
    );

    const keys = [
        ['x', 'y', 'xⁿ', 'ⁿ√', 'AC', 'backspace'],
        ['(', ')', '7', '8', '9', '÷'],
        ['>', '<', '4', '5', '6', '×'],
        ['>=', '<=', '1', '2', '3', '-'],
        ['%', 'a/b', '0', '.', '=', '+']
    ];

    return (
        <div className="grid grid-cols-6 gap-2 text-white">
            {keys.flat().map((key, index) => {
                const columnIndex = index % 6;
                let popupAlignmentClass = 'left-1/2 -translate-x-1/2';
                if (columnIndex < 2) {
                    popupAlignmentClass = 'left-0';
                } 
                else if (columnIndex > 3) {
                    popupAlignmentClass = 'right-0';
                }

                if (key === 'xⁿ') {
                    return (
                        <div key={index} className="relative">
                            <button
                                onMouseDown={() => handlePressStart('power')}
                                onMouseUp={() => handlePressEnd('xⁿ')}
                                onTouchStart={() => handlePressStart('power')}
                                onTouchEnd={() => handlePressEnd('xⁿ')}
                                onClick={handlePowerShortPress}
                                onContextMenu={(e) => e.preventDefault()}
                                aria-label="Power (x to the power of n)"
                                className="h-14 w-full rounded-lg flex items-center justify-center text-2xl transition-colors bg-green-600 hover:bg-green-500"
                            >
                                xⁿ
                            </button>
                            {activeMenu === 'power' && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)}></div>
                                    <div className={`absolute bottom-full mb-2 w-48 bg-gray-600 rounded-lg p-2 flex justify-around z-20 ${popupAlignmentClass} shadow-lg`}>
                                        <button onClick={() => handleOptionClick('x²')} aria-label="x squared" className="p-2 text-xl rounded hover:bg-gray-500">x²</button>
                                        <button onClick={() => handleOptionClick('x³')} aria-label="x cubed" className="p-2 text-xl rounded hover:bg-gray-500">x³</button>
                                        <button onClick={() => handleOptionClick('xⁿ')} aria-label="x to the power of n" className="p-2 text-xl rounded hover:bg-gray-500">xⁿ</button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                }
                
                if (key === 'ⁿ√') {
                    return (
                        <div key={index} className="relative">
                            <button
                                onMouseDown={() => handlePressStart('root')}
                                onMouseUp={() => handlePressEnd('ⁿ√')}
                                onTouchStart={() => handlePressStart('root')}
                                onTouchEnd={() => handlePressEnd('ⁿ√')}
                                onClick={handleRootShortPress}
                                onContextMenu={(e) => e.preventDefault()}
                                aria-label="Nth Root"
                                className="h-14 w-full rounded-lg flex items-center justify-center text-2xl transition-colors bg-green-600 hover:bg-green-500"
                            >
                                ⁿ√
                            </button>
                            {activeMenu === 'root' && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)}></div>
                                    <div className={`absolute bottom-full mb-2 w-48 bg-gray-600 rounded-lg p-2 flex justify-around z-20 ${popupAlignmentClass} shadow-lg`}>
                                        <button onClick={() => handleOptionClick('√')} aria-label="Square Root" className="p-2 text-2xl rounded hover:bg-gray-500">√</button>
                                        <button onClick={() => handleOptionClick('³√')} aria-label="Cube Root" className="p-2 text-2xl rounded hover:bg-gray-500">³√</button>
                                        <button onClick={() => handleOptionClick('ⁿ√')} aria-label="Nth Root" className="p-2 text-2xl rounded hover:bg-gray-500">ⁿ√</button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                }

                if (key === 'a/b') {
                    return (
                        <div key={index} className="relative">
                            <button
                                onMouseDown={() => handlePressStart('fraction')}
                                onMouseUp={() => handlePressEnd('a/b')}
                                onTouchStart={() => handlePressStart('fraction')}
                                onTouchEnd={() => handlePressEnd('a/b')}
                                onClick={handleFractionShortPress}
                                onContextMenu={(e) => e.preventDefault()}
                                aria-label="Fraction"
                                className="h-14 w-full rounded-lg flex items-center justify-center text-2xl transition-colors bg-green-600 hover:bg-green-500"
                            >
                                a/b
                            </button>
                            {activeMenu === 'fraction' && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)}></div>
                                    <div className={`absolute bottom-full mb-2 w-48 bg-gray-600 rounded-lg p-2 flex justify-around z-20 ${popupAlignmentClass} shadow-lg`}>
                                        <button onClick={() => handleOptionClick('a/b')} className="p-2 text-2xl rounded hover:bg-gray-500" aria-label="Simple Fraction">
                                            <span className="inline-flex flex-col items-center text-center align-middle" style={{ verticalAlign: '-0.4em' }}>
                                                <span className="px-1 text-sm border-b-2 border-current leading-none">a</span>
                                                <span className="px-1 text-sm leading-none">b</span>
                                            </span>
                                        </button>
                                        <button onClick={() => handleOptionClick('mixfrac')} className="p-2 text-2xl rounded hover:bg-gray-500" aria-label="Mixed Fraction">
                                             <span className="inline-flex items-center align-middle">
                                                <span className="text-xl">W</span>
                                                <span className="inline-flex flex-col items-center text-center align-middle ml-1" style={{ verticalAlign: '-0.4em' }}>
                                                    <span className="px-1 text-sm border-b-2 border-current leading-none">a</span>
                                                    <span className="px-1 text-sm leading-none">b</span>
                                                </span>
                                            </span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                }

                if (key === '.') {
                    return (
                        <div key={index} className="relative">
                            <button
                                onMouseDown={() => handlePressStart('decimal')}
                                onMouseUp={() => handlePressEnd('.')}
                                onTouchStart={() => handlePressStart('decimal')}
                                onTouchEnd={() => handlePressEnd('.')}
                                onClick={handleDecimalShortPress}
                                onContextMenu={(e) => e.preventDefault()}
                                aria-label=". (удерживайте для ,)"
                                className="h-14 w-full rounded-lg flex items-center justify-center text-2xl transition-colors bg-green-600 hover:bg-green-500"
                            >
                                .
                            </button>
                            {activeMenu === 'decimal' && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)}></div>
                                    <div className={`absolute bottom-full mb-2 bg-gray-600 rounded-lg p-2 flex gap-2 z-20 ${popupAlignmentClass} shadow-lg`}>
                                        <button onClick={() => handleOptionClick('.')} className="px-4 py-2 text-2xl rounded hover:bg-gray-500" aria-label="Decimal point">.</button>
                                        <button onClick={() => handleOptionClick(',')} className="px-4 py-2 text-2xl rounded hover:bg-gray-500" aria-label="Comma">,</button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                }

                const isOperator = ['÷', '×', '-', '+', '='].includes(key);
                const isSpecial = ['AC', 'backspace'].includes(key);
                
                let classes = 'bg-gray-700 hover:bg-gray-600';
                if (isOperator) classes = 'bg-gray-600 hover:bg-gray-500';
                if (isSpecial) classes = 'bg-gray-600 hover:bg-gray-500';
                
                return <Button key={index} value={key} ariaLabel={key === 'backspace' ? t('calculator.backspace') : key === 'AC' ? t('calculator.clear') : undefined} className={classes}>{key === 'backspace' ? (
                    <span className="inline-flex items-center justify-center w-full h-full min-h-[1.5rem]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M6 6v12" />
                            <path d="M6 12h14" />
                            <path d="M10 8l-4 4 4 4" />
                        </svg>
                    </span>
                ) : key}</Button>
            })}
             <button onClick={toggleKeyboard} aria-label={t('calculator.advancedKeyboard')} className="h-14 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xl">sin log</button>
             <button onClick={() => handlePress('system')} aria-label={t('calculator.systemEquations')} className="h-14 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center">
                <span className="text-3xl font-bold leading-none" style={{ fontFamily: 'serif' }}>{'{'}</span>
             </button>
             <button onClick={() => handlePress('left')} aria-label={t('calculator.moveCursorLeft')} className="h-14 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-3xl leading-none">←</button>
             <button onClick={() => handlePress('right')} aria-label={t('calculator.moveCursorRight')} className="h-14 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-3xl leading-none">→</button>
             <button onClick={onCalculate} disabled={isCalculating} aria-label={t('calculator.calculate')} className="h-14 col-span-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xl flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed">
                {isCalculating ? t('calculator.calculating') : t('calculator.calculate')}
             </button>
        </div>
    );
};

export default CalculatorKeyboard;