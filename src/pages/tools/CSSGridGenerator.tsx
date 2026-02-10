import { useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutGrid,
  Copy,
  RotateCcw,
  Plus,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GridItem {
  id: number;
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}

const CSSGridGenerator = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const gridRef = useRef<HTMLDivElement>(null);

  const [columns, setColumns] = useState(5);
  const [rows, setRows] = useState(5);
  const [gap, setGap] = useState(8);
  const [cssMode, setCssMode] = useState<"css" | "tailwind">("css");
  const [items, setItems] = useState<GridItem[]>([]);
  const [itemCounter, setItemCounter] = useState(0);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeItem, setResizeItem] = useState<GridItem | null>(null);
  const [startCell, setStartCell] = useState<{ col: number; row: number } | null>(null);

  const toolT = {
    title: t.tools?.cssGrid?.title || "CSS Grid Generator",
    subtitle: t.tools?.cssGrid?.subtitle || "Create custom CSS grid layouts easily by specifying columns, rows, and gap size",
    columns: t.tools?.cssGrid?.columns || "Columns",
    rows: t.tools?.cssGrid?.rows || "Rows",
    gap: t.tools?.cssGrid?.gap || "Gap (px)",
    reset: t.tools?.cssGrid?.reset || "Reset",
    htmlCode: t.tools?.cssGrid?.htmlCode || "HTML",
    cssCode: t.tools?.cssGrid?.cssCode || "CSS",
    copy: t.common?.copy || "Copy",
    copied: t.common?.copied || "Copied!",
    success: t.messages?.success || "Success",
    clickToAdd: t.tools?.cssGrid?.clickToAdd || "Click on empty cells to add items",
  };

  // Check if a cell is occupied
  const isCellOccupied = useCallback(
    (col: number, row: number) => {
      return items.some(
        (item) =>
          col >= item.colStart &&
          col < item.colEnd &&
          row >= item.rowStart &&
          row < item.rowEnd
      );
    },
    [items]
  );

  // Get item at cell
  const getItemAtCell = useCallback(
    (col: number, row: number) => {
      return items.find(
        (item) =>
          col >= item.colStart &&
          col < item.colEnd &&
          row >= item.rowStart &&
          row < item.rowEnd
      );
    },
    [items]
  );

  // Add new item
  const addItem = useCallback(
    (col: number, row: number) => {
      if (isCellOccupied(col, row)) return;

      const newId = itemCounter + 1;
      setItemCounter(newId);
      setItems((prev) => [
        ...prev,
        {
          id: newId,
          colStart: col,
          colEnd: col + 1,
          rowStart: row,
          rowEnd: row + 1,
        },
      ]);
    },
    [isCellOccupied, itemCounter]
  );

  // Remove item
  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItem === id) setSelectedItem(null);
  }, [selectedItem]);

  // Handle cell click
  const handleCellClick = useCallback(
    (col: number, row: number) => {
      const existingItem = getItemAtCell(col, row);
      if (existingItem) {
        setSelectedItem(existingItem.id);
      } else {
        addItem(col, row);
      }
    },
    [getItemAtCell, addItem]
  );

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, item: GridItem) => {
      e.stopPropagation();
      setIsResizing(true);
      setResizeItem(item);
      setStartCell({ col: item.colEnd - 1, row: item.rowEnd - 1 });
    },
    []
  );

  // Handle resize move
  const handleResizeMove = useCallback(
    (col: number, row: number) => {
      if (!isResizing || !resizeItem) return;

      const newColEnd = Math.max(resizeItem.colStart + 1, Math.min(columns + 1, col + 1));
      const newRowEnd = Math.max(resizeItem.rowStart + 1, Math.min(rows + 1, row + 1));

      // Check if new area overlaps with other items
      let canResize = true;
      for (let c = resizeItem.colStart; c < newColEnd; c++) {
        for (let r = resizeItem.rowStart; r < newRowEnd; r++) {
          const itemAtCell = getItemAtCell(c, r);
          if (itemAtCell && itemAtCell.id !== resizeItem.id) {
            canResize = false;
            break;
          }
        }
        if (!canResize) break;
      }

      if (canResize) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === resizeItem.id
              ? { ...item, colEnd: newColEnd, rowEnd: newRowEnd }
              : item
          )
        );
      }
    },
    [isResizing, resizeItem, columns, rows, getItemAtCell]
  );

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeItem(null);
    setStartCell(null);
  }, []);

  // Reset grid
  const resetGrid = useCallback(() => {
    setItems([]);
    setItemCounter(0);
    setSelectedItem(null);
    setColumns(5);
    setRows(5);
    setGap(8);
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(
    (text: string, type: string) => {
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: toolT.success, description: `${type} ${toolT.copied}` });
      });
    },
    [toast, toolT]
  );

  // Generate HTML code
  const generateHTML = useCallback(() => {
    let html = '<div class="parent">\n';
    items.forEach((item) => {
      html += `  <div class="div${item.id}"></div>\n`;
    });
    html += "</div>";
    return html;
  }, [items]);

  // Generate CSS code
  const generateCSS = useCallback(() => {
    if (cssMode === "tailwind") {
      // Generate Tailwind classes
      const gapClass = gap <= 1 ? "gap-px" : gap <= 2 ? "gap-0.5" : gap <= 4 ? "gap-1" : gap <= 8 ? "gap-2" : gap <= 12 ? "gap-3" : gap <= 16 ? "gap-4" : gap <= 20 ? "gap-5" : gap <= 24 ? "gap-6" : gap <= 32 ? "gap-8" : "gap-10";
      let tailwind = `<!-- Parent container -->\n`;
      tailwind += `<div class="grid grid-cols-${columns} grid-rows-${rows} ${gapClass}">\n`;
      
      items.forEach((item) => {
        const colSpan = item.colEnd - item.colStart;
        const rowSpan = item.rowEnd - item.rowStart;
        let classes = [];
        
        if (colSpan > 1) {
          classes.push(`col-span-${colSpan}`);
        }
        if (item.colStart > 1) {
          classes.push(`col-start-${item.colStart}`);
        }
        if (rowSpan > 1) {
          classes.push(`row-span-${rowSpan}`);
        }
        if (item.rowStart > 1) {
          classes.push(`row-start-${item.rowStart}`);
        }
        
        tailwind += `  <div class="${classes.join(" ")}">Item ${item.id}</div>\n`;
      });
      
      tailwind += `</div>`;
      return tailwind;
    }
    
    // Generate regular CSS
    let css = ".parent {\n";
    css += "  display: grid;\n";
    css += `  grid-template-columns: repeat(${columns}, 1fr);\n`;
    css += `  grid-template-rows: repeat(${rows}, 1fr);\n`;
    css += `  gap: ${gap}px;\n`;
    css += "}\n\n";

    items.forEach((item) => {
      css += `.div${item.id} {\n`;
      if (item.colEnd - item.colStart > 1 || item.colStart > 1) {
        css += `  grid-column: ${item.colStart} / ${item.colEnd};\n`;
      }
      if (item.rowEnd - item.rowStart > 1 || item.rowStart > 1) {
        css += `  grid-row: ${item.rowStart} / ${item.rowEnd};\n`;
      }
      css += "}\n\n";
    });

    return css;
  }, [items, columns, rows, gap, cssMode]);

  // Render grid cells
  const renderCells = () => {
    const cells = [];
    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= columns; col++) {
        const item = getItemAtCell(col, row);
        const isFirstCell = item && item.colStart === col && item.rowStart === row;

        if (item && !isFirstCell) continue;

        if (item && isFirstCell) {
          cells.push(
            <div
              key={`item-${item.id}`}
              className={`relative bg-white dark:bg-slate-800 border rounded-lg flex items-center justify-center font-medium shadow-sm cursor-pointer transition-all ${
                selectedItem === item.id
                  ? "ring-2 ring-primary bg-primary/10"
                  : "hover:shadow-md"
              }`}
              style={{
                gridColumn: `${item.colStart} / ${item.colEnd}`,
                gridRow: `${item.rowStart} / ${item.rowEnd}`,
              }}
              onClick={() => setSelectedItem(item.id)}
            >
              <span className="text-lg">{item.id}</span>
              <button
                className="absolute top-0 right-0 w-6 h-6 bg-red-500 text-white rounded-bl-lg rounded-tr-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item.id);
                }}
              >
                <X className="w-4 h-4" />
              </button>
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-30 hover:opacity-100"
                style={{
                  borderRight: "8px solid currentColor",
                  borderBottom: "8px solid currentColor",
                  borderTop: "8px solid transparent",
                  borderLeft: "8px solid transparent",
                }}
                onMouseDown={(e) => handleResizeStart(e, item)}
              />
            </div>
          );
        } else {
          cells.push(
            <div
              key={`cell-${col}-${row}`}
              className="bg-muted/50 border border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted transition-colors"
              style={{
                gridColumn: `${col} / ${col + 1}`,
                gridRow: `${row} / ${row + 1}`,
              }}
              onClick={() => handleCellClick(col, row)}
              onMouseEnter={() => handleResizeMove(col, row)}
            >
              <Plus className="w-6 h-6 text-muted-foreground/50" />
            </div>
          );
        }
      }
    }
    return cells;
  };

  return (
    <DashboardLayout>
      <div
        className="space-y-6"
        onMouseUp={handleResizeEnd}
        onMouseLeave={handleResizeEnd}
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{toolT.title}</h1>
            <p className="text-muted-foreground">{toolT.subtitle}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Controls */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>{toolT.columns}</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={columns}
                  onChange={(e) => setColumns(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center"
                />
              </div>
              <div className="space-y-2">
                <Label>{toolT.rows}</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center"
                />
              </div>
              <div className="space-y-2">
                <Label>{toolT.gap}</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={gap}
                  onChange={(e) => setGap(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                  className="w-20 text-center"
                />
              </div>
              <Button variant="outline" onClick={resetGrid}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {toolT.reset}
              </Button>
            </div>

            {/* Grid Preview */}
            <div className="border rounded-lg p-4 bg-muted/30 min-h-[400px]">
              <div
                ref={gridRef}
                className="w-full h-[400px]"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                  gap: `${gap}px`,
                }}
              >
                {renderCells()}
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {toolT.clickToAdd}
            </p>

            {/* Code Output */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* HTML */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">{toolT.htmlCode}</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generateHTML(), "HTML")}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {toolT.copy}
                  </Button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-auto max-h-[200px] font-mono">
                  {generateHTML()}
                </pre>
              </div>

              {/* CSS / Tailwind */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Label className="text-lg font-semibold">{cssMode === "tailwind" ? "Tailwind CSS" : toolT.cssCode}</Label>
                    <Select value={cssMode} onValueChange={(v) => setCssMode(v as "css" | "tailwind")}>
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="css">CSS</SelectItem>
                        <SelectItem value="tailwind">Tailwind CSS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generateCSS(), cssMode === "tailwind" ? "Tailwind" : "CSS")}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {toolT.copy}
                  </Button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-auto max-h-[200px] font-mono">
                  {generateCSS()}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CSSGridGenerator;
