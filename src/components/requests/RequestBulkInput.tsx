import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RequestItem } from '@/types/request';

interface ParsedRow {
    raw: string;
    name: string;
    qty: number;
    notes?: string;
}

interface RequestBulkInputProps {
    onImport: (items: RequestItem[]) => void;
}

function extractQty(line: string): { name: string; qty: number | null; notes?: string } {
    let text = line.trim();
    // remove leading numbering
    text = text.replace(/^\s*\d+\s*[\).:-]?\s*/g, '');

    // parenthetical qty
    const paren = text.match(/\((\d+)\)\s*$/);
    if (paren) {
        const qty = parseInt(paren[1], 10);
        const name = text.replace(/\(\d+\)\s*$/, '').trim();
        return { name, qty };
    }

    // hyphen or dash qty at end
    const dash = text.match(/[-–—]\s*(\d+)\s*$/);
    if (dash) {
        const qty = parseInt(dash[1], 10);
        const name = text.replace(/[-–—]\s*\d+\s*$/, '').trim();
        return { name, qty };
    }

    // x format: 2 x Item
    const xmatch = text.match(/^(\d+)\s*[xX]\s*(.+)$/);
    if (xmatch) {
        return { name: xmatch[2].trim(), qty: parseInt(xmatch[1], 10) };
    }

    // trailing number fallback
    const trailing = text.match(/(\d+)\s*$/);
    if (trailing) {
        const qty = parseInt(trailing[1], 10);
        const name = text.replace(/\d+\s*$/, '').trim();
        return { name, qty };
    }

    return { name: text, qty: null };
}

export const RequestBulkInput: React.FC<RequestBulkInputProps> = ({ onImport }) => {
    const [text, setText] = useState('');
    const [rows, setRows] = useState<ParsedRow[]>([]);

    const parse = () => {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const parsed: ParsedRow[] = lines.map(l => {
            const { name, qty, notes } = extractQty(l);
            return {
                raw: l,
                name: name || l,
                qty: qty || 1,
                notes: notes || ''
            };
        });
        setRows(parsed);
    };

    const updateRow = (index: number, data: Partial<ParsedRow>) => {
        setRows(prev => prev.map((r, i) => i === index ? { ...r, ...data } : r));
    };

    const importSelected = () => {
        const items: RequestItem[] = rows.filter(r => r.qty > 0).map(r => ({
            name: r.name,
            quantity: r.qty,
            notes: r.notes || ''
        }));
        onImport(items);
        setText('');
        setRows([]);
    };

    return (
        <div className="space-y-4">
            <div>
                <Label>Paste items (one per line)</Label>
                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={'1. Cement (5)\n2. Shovel - 3\n3 x Wheelbarrow\n...'}
                    className="min-h-[140px] mt-2"
                />
                <div className="flex gap-2 mt-2">
                    <Button type="button" onClick={parse} size="sm">Parse</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setText(''); setRows([]); }}>Clear</Button>
                </div>
            </div>

            {rows.length > 0 && (
                <div>
                    <Label>Parsed Preview ({rows.length} items)</Label>
                    <div className="space-y-2 mt-2">
                        {rows.map((r, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 border rounded text-sm">
                                <div className="col-span-6">
                                    <Input
                                        value={r.name}
                                        onChange={(e) => updateRow(i, { name: e.target.value })}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        type="number"
                                        value={r.qty}
                                        min={1}
                                        onChange={(e) => updateRow(i, { qty: parseInt(e.target.value || '1', 10) })}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <Input
                                        value={r.notes || ''}
                                        onChange={(e) => updateRow(i, { notes: e.target.value })}
                                        placeholder="Notes (optional)"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-end pt-2">
                            <Button onClick={importSelected} size="sm">
                                Import {rows.length} item{rows.length !== 1 ? 's' : ''}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestBulkInput;
