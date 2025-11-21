import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Asset, WaybillItem } from '@/types/asset';

interface ParsedRow {
  raw: string;
  name: string;
  qty: number;
  matchedAssetId?: string;
  matchedAssetName?: string;
  availableQuantity?: number;
  status?: 'ok' | 'short' | 'not_found';
}

interface WaybillBulkInputProps {
  assets: Asset[];
  onImport: (items: WaybillItem[]) => void;
}

const normalize = (s: string) => s.toLowerCase().replace(/[\u2018\u2019\u201c\u201d\()\[\]{}.,]/g, ' ').replace(/\s+/g, ' ').trim();

function extractQty(line: string): { name: string; qty: number | null } {
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

function matchAsset(name: string, assets: Asset[]) {
  const norm = normalize(name);
  if (!norm) return null;
  // exact
  for (const a of assets) {
    if (normalize(a.name) === norm) return a;
  }
  // startsWith
  for (const a of assets) {
    if (normalize(a.name).startsWith(norm) || norm.startsWith(normalize(a.name))) return a;
  }
  // includes
  for (const a of assets) {
    if (normalize(a.name).includes(norm) || norm.includes(normalize(a.name))) return a;
  }
  return null;
}

export const WaybillBulkInput: React.FC<WaybillBulkInputProps> = ({ assets, onImport }) => {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);

  const parse = () => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed: ParsedRow[] = lines.map(l => {
      const { name, qty } = extractQty(l);
      const asset = matchAsset(name, assets);
      const available = asset ? asset.quantity - (asset.reservedQuantity || 0) - (asset.damagedCount || 0) - (asset.missingCount || 0) : undefined;
      const status: ParsedRow['status'] = asset ? ((qty && available !== undefined && qty > available) ? 'short' : 'ok') : 'not_found';
      return {
        raw: l,
        name: name || l,
        qty: qty || 0,
        matchedAssetId: asset?.id,
        matchedAssetName: asset?.name,
        availableQuantity: available,
        status
      };
    });
    setRows(parsed);
  };

  const rematch = (index: number) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r;
      const asset = matchAsset(r.name, assets);
      const available = asset ? asset.quantity - (asset.reservedQuantity || 0) - (asset.damagedCount || 0) - (asset.missingCount || 0) : undefined;
      const status: ParsedRow['status'] = asset ? ((r.qty && available !== undefined && r.qty > available) ? 'short' : 'ok') : 'not_found';
      return { ...r, matchedAssetId: asset?.id, matchedAssetName: asset?.name, availableQuantity: available, status };
    }));
  };

  const updateRow = (index: number, data: Partial<ParsedRow>) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, ...data } : r));
  };

  const importSelected = () => {
    const items: WaybillItem[] = rows.filter(r => r.qty > 0).map(r => ({
      assetId: r.matchedAssetId || '',
      assetName: r.matchedAssetName || r.name,
      quantity: r.qty,
      returnedQuantity: 0,
      status: 'outstanding'
    }));
    onImport(items);
  };

  const suggestions = useMemo(() => assets.map(a => a.name), [assets]);

  return (
    <div className="space-y-4">
      <div>
        <Label>Paste items (one per line)</Label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'1. Geho pump (730 &736) (2)\n2. Suction hose (4)\n...'} className="min-h-[140px]" />
        <div className="flex gap-2 mt-2">
          <Button type="button" onClick={parse}>Parse</Button>
          <Button type="button" variant="ghost" onClick={() => { setText(''); setRows([]); }}>Clear</Button>
        </div>
      </div>

      <div>
        <Label>Parsed Preview</Label>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No parsed rows yet.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                <div className="col-span-5">
                  <Input value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Input type="number" value={r.qty} min={0} onChange={(e) => updateRow(i, { qty: parseInt(e.target.value || '0', 10) })} />
                </div>
                <div className="col-span-3 text-sm">
                  <div>{r.matchedAssetName || 'No match'}</div>
                  <div className="text-xs text-muted-foreground">Available: {r.availableQuantity ?? '—'}</div>
                </div>
                <div className="col-span-2 flex gap-2">
                  <Button size="sm" onClick={() => rematch(i)}>Rematch</Button>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button onClick={importSelected}>Import {rows.length} items</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaybillBulkInput;
