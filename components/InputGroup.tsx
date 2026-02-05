
import React from 'react';

interface InputGroupProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, icon, children, description }) => {
  return (
    <div className="flex flex-col space-y-2 w-full group">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 group-focus-within:text-red-600 transition-colors">
        <span className="opacity-70">{icon}</span>
        {label}
      </label>
      <div className="relative">
        {children}
      </div>
      {description && <p className="text-[9px] text-slate-400 font-medium italic pl-1 leading-tight">{description}</p>}
    </div>
  );
};

export default InputGroup;
