
import React from 'react';

interface InputGroupProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, icon, children, description }) => {
  return (
    <div className="flex flex-col space-y-1.5 w-full">
      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        {icon}
        {label}
      </label>
      {children}
      {description && <p className="text-xs text-slate-400 italic">{description}</p>}
    </div>
  );
};

export default InputGroup;
