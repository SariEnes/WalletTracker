import React, { useState, useRef, useEffect } from "react";
import { Edit2 } from "lucide-react";

interface EditableNameProps {
  initialName: string;
  onSave: (newName: string) => void;
  className?: string;
}

export function EditableName({ initialName, onSave, className = "" }: EditableNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (name.trim() && name !== initialName) {
      onSave(name.trim());
    } else {
      setName(initialName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setName(initialName);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => {
          if (e.target.value.length <= 25) {
            setName(e.target.value);
          }
        }}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        maxLength={25}
        style={{ maxWidth: "200px" }}
        className={`bg-transparent border-b border-cyan-500/50 text-cyan-400 font-mono px-0 py-0 rounded-none outline-none w-full ${className}`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div className={`group flex items-center gap-2 cursor-default ${className}`}>
      <span className="truncate border-b border-transparent transition-colors">
        {name}
      </span>
      <Edit2 
        className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer hover:text-cyan-400" 
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      />
    </div>
  );
}
