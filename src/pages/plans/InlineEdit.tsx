import { useState } from 'react';

export function InlineEdit({ value, onSave, type = 'text', placeholder = '' }: { value: string; onSave: (v: string) => void; type?: string; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  if (!editing) return <span className="cursor-pointer hover:bg-slate-100 px-0.5 py-0.5 rounded text-xs inline-block min-w-[30px]" onClick={() => { setVal(value); setEditing(true); }}>{value || <span className="text-muted-foreground">{placeholder}</span>}</span>;
  return <input type={type} value={val} onChange={e => setVal(e.target.value)} onBlur={() => { if (val !== value) onSave(val); setEditing(false); }} onKeyDown={e => { if (e.key === 'Enter') { if (val !== value) onSave(val); setEditing(false); } if (e.key === 'Escape') setEditing(false); }} autoFocus className="border rounded px-1 py-0.5 text-xs w-full max-w-[100px]" title="Éditer la valeur" />;
}
