import { useState, useCallback, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Palette,
  Copy,
  RefreshCw,
  ArrowLeftRight,
} from "lucide-react";

// Color conversion utilities
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

// Mix two colors
const mixColors = (color1: string, color2: string, ratio: number): string => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
  const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
  const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

  return rgbToHex(r, g, b);
};

// Get complementary color
const getComplementary = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
};

// Get lighter/darker shades
const adjustLightness = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.l = Math.max(0, Math.min(100, hsl.l + amount));
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

const ColorTools = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const colorWheelRef = useRef<HTMLCanvasElement>(null);

  // Main color state
  const [mainColor, setMainColor] = useState("#4338ca");
  const [colorInput, setColorInput] = useState("#4338ca");

  // Color mixer state
  const [mixColor1, setMixColor1] = useState("#ff0000");
  const [mixColor2, setMixColor2] = useState("#0000ff");
  const [mixRatio, setMixRatio] = useState(50);

  // Gradient state
  const [gradientStart, setGradientStart] = useState("#4338ca");
  const [gradientEnd, setGradientEnd] = useState("#ec4899");
  const [gradientType, setGradientType] = useState("linear");
  const [gradientAngle, setGradientAngle] = useState(90);

  const toolT = {
    title: t.tools?.colorTools?.title || "Color Tools",
    subtitle: t.tools?.colorTools?.subtitle || "Pick, convert, mix colors and generate gradients",
    colorPicker: t.tools?.colorTools?.colorPicker || "Color Picker",
    colorValues: t.tools?.colorTools?.colorValues || "Color Values",
    colorVariations: t.tools?.colorTools?.colorVariations || "Color Variations",
    colorMixer: t.tools?.colorTools?.colorMixer || "Color Mixer",
    gradientGenerator: t.tools?.colorTools?.gradientGenerator || "Gradient Generator",
    mixRatio: t.tools?.colorTools?.mixRatio || "Mix Ratio",
    result: t.tools?.colorTools?.result || "Result",
    swap: t.tools?.colorTools?.swap || "Swap",
    gradientAngle: t.tools?.colorTools?.gradientAngle || "Angle",
    gradientType: t.tools?.colorTools?.gradientType || "Type",
    linear: t.tools?.colorTools?.linear || "Linear",
    radial: t.tools?.colorTools?.radial || "Radial",
    copyCode: t.tools?.colorTools?.copyCode || "Copy CSS",
    lighter: t.tools?.colorTools?.lighter || "Lighter",
    darker: t.tools?.colorTools?.darker || "Darker",
    complementary: t.tools?.colorTools?.complementary || "Complementary",
    copy: t.common?.copy || "Copy",
    copied: t.common?.copied || "Copied!",
    success: t.messages?.success || "Success",
    error: t.messages?.error || "Error",
  };

  // Draw color wheel
  useEffect(() => {
    const canvas = colorWheelRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 5;

    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = ((angle - 1) * Math.PI) / 180;
      const endAngle = ((angle + 1) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, "white");
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }, []);

  // Handle color wheel click
  const handleColorWheelClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = colorWheelRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(imageData[0], imageData[1], imageData[2]);
    setMainColor(hex);
    setColorInput(hex);
  }, []);

  // Handle color input change
  const handleColorInputChange = useCallback((value: string) => {
    setColorInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setMainColor(value);
    }
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: toolT.success, description: toolT.copied });
    });
  }, [toast, toolT]);

  // Get color values
  const rgb = hexToRgb(mainColor);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : { h: 0, s: 0, l: 0 };

  // Get mixed color
  const mixedColor = mixColors(mixColor1, mixColor2, mixRatio / 100);

  // Get gradient CSS
  const gradientCSS =
    gradientType === "linear"
      ? `linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd})`
      : `radial-gradient(circle, ${gradientStart}, ${gradientEnd})`;

  // Get color variations
  const variations = [
    { label: `${toolT.lighter} +30%`, color: adjustLightness(mainColor, 30) },
    { label: `${toolT.lighter} +20%`, color: adjustLightness(mainColor, 20) },
    { label: `${toolT.lighter} +10%`, color: adjustLightness(mainColor, 10) },
    { label: "Original", color: mainColor },
    { label: `${toolT.darker} -10%`, color: adjustLightness(mainColor, -10) },
    { label: `${toolT.darker} -20%`, color: adjustLightness(mainColor, -20) },
    { label: `${toolT.darker} -30%`, color: adjustLightness(mainColor, -30) },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{toolT.title}</h1>
            <p className="text-muted-foreground">{toolT.subtitle}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Color Picker */}
          <Card>
            <CardHeader>
              <CardTitle>{toolT.colorPicker}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <canvas
                  ref={colorWheelRef}
                  width={200}
                  height={200}
                  onClick={handleColorWheelClick}
                  className="rounded-full cursor-crosshair shadow-lg"
                />
                <div className="flex-1 space-y-4 w-full">
                  <div
                    className="h-24 rounded-lg shadow-inner"
                    style={{ backgroundColor: mainColor }}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={mainColor}
                      onChange={(e) => {
                        setMainColor(e.target.value);
                        setColorInput(e.target.value);
                      }}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={colorInput}
                      onChange={(e) => handleColorInputChange(e.target.value)}
                      placeholder="#4338ca"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Color Values */}
              <div className="bg-muted rounded-lg p-4 space-y-2 font-mono text-sm">
                <div className="flex justify-between items-center">
                  <span>HEX:</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(mainColor)}>
                    {mainColor} <Copy className="w-3 h-3 ml-2" />
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <span>RGB:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`rgb(${rgb?.r}, ${rgb?.g}, ${rgb?.b})`)}
                  >
                    rgb({rgb?.r}, {rgb?.g}, {rgb?.b}) <Copy className="w-3 h-3 ml-2" />
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <span>HSL:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)}
                  >
                    hsl({hsl.h}, {hsl.s}%, {hsl.l}%) <Copy className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Color Variations */}
              <div className="space-y-2">
                <Label>{toolT.colorVariations}</Label>
                <div className="grid grid-cols-7 gap-1">
                  {variations.map((v, i) => (
                    <button
                      key={i}
                      className="h-10 rounded cursor-pointer hover:ring-2 ring-offset-2 transition-all"
                      style={{ backgroundColor: v.color }}
                      onClick={() => {
                        setMainColor(v.color);
                        setColorInput(v.color);
                      }}
                      title={v.label}
                    />
                  ))}
                </div>
              </div>

              {/* Complementary */}
              <div className="flex items-center gap-4">
                <span className="text-sm">{toolT.complementary}:</span>
                <button
                  className="h-8 w-16 rounded cursor-pointer hover:ring-2 ring-offset-2 transition-all"
                  style={{ backgroundColor: getComplementary(mainColor) }}
                  onClick={() => {
                    const comp = getComplementary(mainColor);
                    setMainColor(comp);
                    setColorInput(comp);
                  }}
                  title={getComplementary(mainColor)}
                />
                <span className="text-sm font-mono">{getComplementary(mainColor)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Color Mixer & Gradient */}
          <div className="space-y-6">
            {/* Color Mixer */}
            <Card>
              <CardHeader>
                <CardTitle>{toolT.colorMixer}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={mixColor1}
                    onChange={(e) => setMixColor1(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={mixColor1}
                    onChange={(e) => setMixColor1(e.target.value)}
                    className="font-mono flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => {
                    const temp = mixColor1;
                    setMixColor1(mixColor2);
                    setMixColor2(temp);
                  }}>
                    <ArrowLeftRight className="w-4 h-4" />
                  </Button>
                  <Input
                    type="color"
                    value={mixColor2}
                    onChange={(e) => setMixColor2(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={mixColor2}
                    onChange={(e) => setMixColor2(e.target.value)}
                    className="font-mono flex-1"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{toolT.mixRatio}</span>
                    <span>{mixRatio}%</span>
                  </div>
                  <Slider
                    value={[mixRatio]}
                    onValueChange={(v) => setMixRatio(v[0])}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm">{toolT.result}:</span>
                  <div
                    className="h-10 flex-1 rounded-lg"
                    style={{ backgroundColor: mixedColor }}
                  />
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(mixedColor)}>
                    {mixedColor} <Copy className="w-3 h-3 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Gradient Generator */}
            <Card>
              <CardHeader>
                <CardTitle>{toolT.gradientGenerator}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value)}
                    className="font-mono flex-1"
                  />
                  <Input
                    type="color"
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value)}
                    className="font-mono flex-1"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>{toolT.gradientType}</Label>
                    <Select value={gradientType} onValueChange={setGradientType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">{toolT.linear}</SelectItem>
                        <SelectItem value="radial">{toolT.radial}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {gradientType === "linear" && (
                    <div className="space-y-2 flex-1">
                      <Label>{toolT.gradientAngle}: {gradientAngle}°</Label>
                      <Slider
                        value={[gradientAngle]}
                        onValueChange={(v) => setGradientAngle(v[0])}
                        max={360}
                        step={1}
                      />
                    </div>
                  )}
                </div>

                <div
                  className="h-24 rounded-lg"
                  style={{ background: gradientCSS }}
                />

                <div className="flex items-center gap-2">
                  <Input
                    value={`background: ${gradientCSS};`}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`background: ${gradientCSS};`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ColorTools;
