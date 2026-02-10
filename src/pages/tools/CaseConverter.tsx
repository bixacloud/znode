import { useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Type,
  Copy,
  Trash2,
  Download,
  CaseLower,
  CaseUpper,
  CaseSensitive,
  ALargeSmall,
} from "lucide-react";

const CaseConverter = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [text, setText] = useState("");

  const toolT = {
    title: t.tools?.caseConverter?.title || "Case Converter",
    subtitle: t.tools?.caseConverter?.subtitle || "Convert your text to different case formats with just one click",
    placeholder: t.tools?.caseConverter?.placeholder || "Enter your text here to convert to different cases...",
    sentenceCase: t.tools?.caseConverter?.sentenceCase || "Sentence case",
    lowerCase: t.tools?.caseConverter?.lowerCase || "lower case",
    upperCase: t.tools?.caseConverter?.upperCase || "UPPER CASE",
    capitalizedCase: t.tools?.caseConverter?.capitalizedCase || "Capitalized Case",
    alternatingCase: t.tools?.caseConverter?.alternatingCase || "aLtErNaTiNg cAsE",
    titleCase: t.tools?.caseConverter?.titleCase || "Title Case",
    inverseCase: t.tools?.caseConverter?.inverseCase || "InVeRsE CaSe",
    downloadText: t.tools?.caseConverter?.downloadText || "Download Text",
    copy: t.common?.copy || "Copy",
    clear: t.common?.clear || "Clear",
    copied: t.common?.copied || "Copied to clipboard!",
    cleared: t.tools?.caseConverter?.cleared || "Text cleared",
    noText: t.tools?.caseConverter?.noText || "Please enter some text first",
    converted: t.tools?.caseConverter?.converted || "Text converted!",
    downloaded: t.tools?.caseConverter?.downloaded || "Text downloaded!",
    success: t.messages?.success || "Success",
    error: t.messages?.error || "Error",
  };

  // Convert to sentence case
  const toSentenceCase = (str: string) => {
    return str.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (match) => match.toUpperCase());
  };

  // Convert to title case (proper nouns)
  const toTitleCase = (str: string) => {
    const minorWords = ["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "from", "by", "in", "of"];
    return str.toLowerCase().replace(/\w\S*/g, (word, index) => {
      if (index === 0 || !minorWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.substr(1);
      }
      return word;
    });
  };

  // Convert to alternating case
  const toAlternatingCase = (str: string) => {
    return str
      .split("")
      .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
      .join("");
  };

  // Convert to inverse case
  const toInverseCase = (str: string) => {
    return str
      .split("")
      .map((char) => (char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()))
      .join("");
  };

  // Convert to capitalized case
  const toCapitalizedCase = (str: string) => {
    return str.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase());
  };

  const convertCase = useCallback(
    (caseType: string) => {
      if (!text.trim()) {
        toast({ title: toolT.error, description: toolT.noText, variant: "destructive" });
        return;
      }

      let result = text;
      switch (caseType) {
        case "sentence":
          result = toSentenceCase(text);
          break;
        case "lower":
          result = text.toLowerCase();
          break;
        case "upper":
          result = text.toUpperCase();
          break;
        case "capitalized":
          result = toCapitalizedCase(text);
          break;
        case "alternating":
          result = toAlternatingCase(text);
          break;
        case "title":
          result = toTitleCase(text);
          break;
        case "inverse":
          result = toInverseCase(text);
          break;
      }

      setText(result);
      toast({ title: toolT.success, description: toolT.converted });
    },
    [text, toast, toolT]
  );

  const copyToClipboard = useCallback(() => {
    if (!text.trim()) {
      toast({ title: toolT.error, description: toolT.noText, variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: toolT.success, description: toolT.copied });
    });
  }, [text, toast, toolT]);

  const clearText = useCallback(() => {
    setText("");
    toast({ title: toolT.success, description: toolT.cleared });
  }, [toast, toolT]);

  const downloadText = useCallback(() => {
    if (!text.trim()) {
      toast({ title: toolT.error, description: toolT.noText, variant: "destructive" });
      return;
    }

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted-text.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: toolT.success, description: toolT.downloaded });
  }, [text, toast, toolT]);

  const caseButtons = [
    { type: "sentence", label: toolT.sentenceCase, icon: CaseSensitive },
    { type: "lower", label: toolT.lowerCase, icon: CaseLower },
    { type: "upper", label: toolT.upperCase, icon: CaseUpper },
    { type: "capitalized", label: toolT.capitalizedCase, icon: ALargeSmall },
    { type: "alternating", label: toolT.alternatingCase, icon: Type },
    { type: "title", label: toolT.titleCase, icon: Type },
    { type: "inverse", label: toolT.inverseCase, icon: Type },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <Type className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{toolT.title}</h1>
            <p className="text-muted-foreground">{toolT.subtitle}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Text Area */}
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={toolT.placeholder}
              className="min-h-[200px] text-base"
            />

            {/* Case Conversion Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {caseButtons.map((btn) => (
                <Button
                  key={btn.type}
                  variant="outline"
                  className="h-auto py-3 px-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => convertCase(btn.type)}
                >
                  <btn.icon className="w-5 h-5" />
                  <span className="text-sm">{btn.label}</span>
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-auto py-3 px-4 flex flex-col items-center gap-2 hover:bg-green-500 hover:text-white transition-colors"
                onClick={downloadText}
              >
                <Download className="w-5 h-5" />
                <span className="text-sm">{toolT.downloadText}</span>
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={copyToClipboard}>
                <Copy className="w-4 h-4 mr-2" />
                {toolT.copy}
              </Button>
              <Button variant="outline" onClick={clearText}>
                <Trash2 className="w-4 h-4 mr-2" />
                {toolT.clear}
              </Button>
            </div>

            {/* Info Box */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-semibold mb-2">About Case Converter</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Sentence case:</strong> Capitalizes the first letter of each sentence.</li>
                <li>• <strong>lower case:</strong> Converts all text to lowercase.</li>
                <li>• <strong>UPPER CASE:</strong> Converts all text to uppercase.</li>
                <li>• <strong>Capitalized Case:</strong> Capitalizes the first letter of each word.</li>
                <li>• <strong>aLtErNaTiNg cAsE:</strong> Alternates between lowercase and uppercase letters.</li>
                <li>• <strong>Title Case:</strong> Capitalizes words except for articles, conjunctions, and prepositions.</li>
                <li>• <strong>InVeRsE CaSe:</strong> Inverts the case of each letter.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CaseConverter;
