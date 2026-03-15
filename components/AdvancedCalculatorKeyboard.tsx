import React, { useState, useRef } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface KeyboardProps {
    onKeyPress: (key: string) => void;
    toggleKeyboard: () => void;
    onCalculate: () => void;
    isCalculating: boolean;
}

const AdvancedCalculatorKeyboard: React.FC<KeyboardProps> = ({ onKeyPress, toggleKeyboard, onCalculate, isCalculating }) => {
    const { t } = useLocalization();
    const [logMenuOpen, setLogMenuOpen] = useState(false);
    const logMenuTimerRef = useRef<number | null>(null);

    const handlePress = (key: string) => {
        onKeyPress(key);
    };

    const handleLogPressStart = () => {
        logMenuTimerRef.current = window.setTimeout(() => {
            setLogMenuOpen(true);
            logMenuTimerRef.current = null;
        }, 500);
    };

    const handleLogPressEnd = () => {
        if (logMenuTimerRef.current) {
            clearTimeout(logMenuTimerRef.current);
            logMenuTimerRef.current = null;
        }
    };

    const handleLogShortPress = () => {
        if (!logMenuOpen) onKeyPress('log');
    };

    const handleLogOptionClick = (key: string) => {
        onKeyPress(key);
        setLogMenuOpen(false);
    };

    const Button: React.FC<{ value: string; className?: string; children: React.ReactNode; span?: number; ariaLabel?: string }> = ({ value, className = '', children, span = 1, ariaLabel }) => {
        const spanClass = span === 2 ? 'col-span-2' : 'col-span-1';
        return (
            <button onClick={() => handlePress(value)} aria-label={ariaLabel || value} className={`h-14 rounded-lg flex items-center justify-center text-xl transition-colors ${spanClass} ${className}`}>
                {children}
            </button>
        );
    };

    return (
        <div className="grid grid-cols-6 gap-2 text-white">
            {/* Row 1: log (long-press → log/lg/ln), k, ∞, e, AC, backspace */}
            <div className="relative col-span-1">
                <button
                    onMouseDown={handleLogPressStart}
                    onMouseUp={handleLogPressEnd}
                    onMouseLeave={handleLogPressEnd}
                    onTouchStart={handleLogPressStart}
                    onTouchEnd={handleLogPressEnd}
                    onClick={handleLogShortPress}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-label="log (long press for lg, ln)"
                    className="h-14 w-full rounded-lg flex items-center justify-center text-xl transition-colors bg-green-600 hover:bg-green-500"
                >
                    log
                </button>
                {logMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setLogMenuOpen(false)} aria-hidden />
                        <div className="absolute bottom-full mb-2 left-0 right-0 w-full min-w-[12rem] bg-gray-600 rounded-lg p-2 flex justify-around gap-2 z-20 shadow-lg">
                            <button onClick={() => handleLogOptionClick('log')} className="flex-1 py-2 text-lg rounded hover:bg-gray-500">log</button>
                            <button onClick={() => handleLogOptionClick('lg')} className="flex-1 py-2 text-lg rounded hover:bg-gray-500">lg</button>
                            <button onClick={() => handleLogOptionClick('ln')} className="flex-1 py-2 text-lg rounded hover:bg-gray-500">ln</button>
                        </div>
                    </>
                )}
            </div>
            <Button value="π" className="bg-gray-700 hover:bg-gray-600">π</Button>
            <Button value="∞" className="bg-gray-700 hover:bg-gray-600">∞</Button>
            <Button value="e" className="bg-gray-700 hover:bg-gray-600">e</Button>
            <Button value="AC" className="bg-gray-600 hover:bg-gray-500" ariaLabel={t('calculator.clear')}>AC</Button>
            <Button value="backspace" className="bg-gray-600 hover:bg-gray-500" ariaLabel={t('calculator.backspace')}>
                <span className="inline-flex items-center justify-center w-full min-h-[1.5rem]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M6 6v12" />
                        <path d="M6 12h14" />
                        <path d="M10 8l-4 4 4 4" />
                    </svg>
                </span>
            </Button>

            {/* Row 2: [, ], sin, cos, tg, ctg */}
            <Button value="[" className="bg-gray-700 hover:bg-gray-600">[</Button>
            <Button value="]" className="bg-gray-700 hover:bg-gray-600">]</Button>
            <Button value="sin" className="bg-gray-700 hover:bg-gray-600">sin</Button>
            <Button value="cos" className="bg-gray-700 hover:bg-gray-600">cos</Button>
            <Button value="tan" className="bg-gray-700 hover:bg-gray-600">tg</Button>
            <Button value="ctg" className="bg-gray-700 hover:bg-gray-600">ctg</Button>

            {/* Row 3: x°, 30°, arcsin, arctg (по 2 шириной) */}
            <Button value="°" className="bg-gray-700 hover:bg-gray-600">x°</Button>
            <Button value="30°" className="bg-gray-700 hover:bg-gray-600">30°</Button>
            <Button value="arcsin" className="bg-gray-700 hover:bg-gray-600" span={2}>arcsin</Button>
            <Button value="arctan" className="bg-gray-700 hover:bg-gray-600" span={2}>arctg</Button>

            {/* Row 4: 45°, 60°, arccos, arcctg (по 2 шириной) */}
            <Button value="45°" className="bg-gray-700 hover:bg-gray-600">45°</Button>
            <Button value="60°" className="bg-gray-700 hover:bg-gray-600">60°</Button>
            <Button value="arccos" className="bg-gray-700 hover:bg-gray-600" span={2}>arccos</Button>
            <Button value="arcctg" className="bg-gray-700 hover:bg-gray-600" span={2}>arcctg</Button>

            {/* Row 5: a, b, c, m, n, π */}
            <Button value="a" className="bg-gray-700 hover:bg-gray-600">a</Button>
            <Button value="b" className="bg-gray-700 hover:bg-gray-600">b</Button>
            <Button value="c" className="bg-gray-700 hover:bg-gray-600">c</Button>
            <Button value="m" className="bg-gray-700 hover:bg-gray-600">m</Button>
            <Button value="n" className="bg-gray-700 hover:bg-gray-600">n</Button>
            <Button value="k" className="bg-gray-700 hover:bg-gray-600">k</Button>

            {/* Row 6: 123, system, ←, →, Вычислить */}
            <button onClick={toggleKeyboard} aria-label={t('calculator.basicKeyboard')} className="h-14 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xl">123</button>
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

export default AdvancedCalculatorKeyboard;