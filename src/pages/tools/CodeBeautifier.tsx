import { useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Code2,
  Copy,
  Trash2,
  Sparkles,
  Minimize2,
  ArrowRightLeft,
} from "lucide-react";

// CodeMirror imports
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

// js-beautify imports
import { html as htmlBeautify } from 'js-beautify';
import { css as cssBeautify } from 'js-beautify';
import { js as jsBeautify } from 'js-beautify';

const CodeBeautifier = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [language, setLanguage] = useState("html");
  const [indentSize, setIndentSize] = useState("2");
  const [inputCode, setInputCode] = useState(`<!DOCTYPE html>
<html>
<head>
    <title>Example</title>
</head>
<body>
    <h1>Hello World</h1>
    <p>This is a sample HTML document.</p>
</body>
</html>`);
  const [outputCode, setOutputCode] = useState("");

  const toolT = {
    title: t.tools?.codeBeautifier?.title || "Code Beautifier & Minifier",
    subtitle: t.tools?.codeBeautifier?.subtitle || "Format, beautify or minify your HTML, CSS, and JavaScript code",
    language: t.tools?.codeBeautifier?.language || "Language",
    indentSize: t.tools?.codeBeautifier?.indentSize || "Indent Size",
    inputCode: t.tools?.codeBeautifier?.inputCode || "Input Code",
    outputCode: t.tools?.codeBeautifier?.outputCode || "Output Code",
    beautify: t.tools?.codeBeautifier?.beautify || "Beautify",
    minify: t.tools?.codeBeautifier?.minify || "Minify",
    copy: t.common?.copy || "Copy",
    clear: t.common?.clear || "Clear",
    copied: t.common?.copied || "Copied!",
    cleared: t.tools?.codeBeautifier?.cleared || "Editors cleared!",
    noCode: t.tools?.codeBeautifier?.noCode || "Please enter some code first",
    beautified: t.tools?.codeBeautifier?.beautified || "Code beautified successfully!",
    minified: t.tools?.codeBeautifier?.minified || "Code minified successfully!",
    success: t.messages?.success || "Success",
    error: t.messages?.error || "Error",
    useAsInput: t.tools?.codeBeautifier?.useAsInput || "Use as Input",
  };

  // Get CodeMirror language extension based on selected language
  const getLanguageExtension = useCallback(() => {
    switch (language) {
      case "html":
        return html();
      case "css":
        return css();
      case "javascript":
        return javascript();
      case "json":
        return json();
      default:
        return html();
    }
  }, [language]);

  // Beautify code
  const beautifyCode = useCallback(() => {
    if (!inputCode.trim()) {
      toast({ title: toolT.error, description: toolT.noCode, variant: "destructive" });
      return;
    }

    try {
      const options = {
        indent_size: parseInt(indentSize),
        indent_char: " ",
        max_preserve_newlines: 2,
        preserve_newlines: true,
        end_with_newline: true,
      };

      let result = "";
      switch (language) {
        case "html":
          result = htmlBeautify(inputCode, options);
          break;
        case "css":
          result = cssBeautify(inputCode, options);
          break;
        case "javascript":
          result = jsBeautify(inputCode, options);
          break;
        case "json":
          // JSON beautify using native JSON.parse/stringify
          try {
            const parsed = JSON.parse(inputCode);
            result = JSON.stringify(parsed, null, parseInt(indentSize));
          } catch {
            toast({ title: toolT.error, description: "Invalid JSON", variant: "destructive" });
            return;
          }
          break;
        default:
          result = inputCode;
      }

      setOutputCode(result);
      toast({ title: toolT.success, description: toolT.beautified });
    } catch (error) {
      toast({ title: toolT.error, description: String(error), variant: "destructive" });
    }
  }, [inputCode, language, indentSize, toast, toolT]);

  // Simple minify function (basic implementation)
  const minifyCode = useCallback(() => {
    if (!inputCode.trim()) {
      toast({ title: toolT.error, description: toolT.noCode, variant: "destructive" });
      return;
    }

    try {
      let result = inputCode;

      switch (language) {
        case "html":
          // Remove comments, whitespace between tags
          result = result
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/>\s+</g, "><")
            .replace(/\s{2,}/g, " ")
            .trim();
          break;
        case "css":
          // Remove comments, extra whitespace
          result = result
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\s{2,}/g, " ")
            .replace(/\s*{\s*/g, "{")
            .replace(/\s*}\s*/g, "}")
            .replace(/\s*:\s*/g, ":")
            .replace(/\s*;\s*/g, ";")
            .replace(/;\}/g, "}")
            .trim();
          break;
        case "javascript":
          // Basic JS minification (remove comments and extra whitespace)
          result = result
            .replace(/\/\/.*$/gm, "")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\s{2,}/g, " ")
            .replace(/\s*([{};,=+\-*/<>!&|?:])\s*/g, "$1")
            .trim();
          break;
        case "json":
          // JSON minify using native JSON.parse/stringify
          try {
            const parsed = JSON.parse(inputCode);
            result = JSON.stringify(parsed);
          } catch {
            toast({ title: toolT.error, description: "Invalid JSON", variant: "destructive" });
            return;
          }
          break;
      }

      setOutputCode(result);
      toast({ title: toolT.success, description: toolT.minified });
    } catch (error) {
      toast({ title: toolT.error, description: String(error), variant: "destructive" });
    }
  }, [inputCode, language, toast, toolT]);

  const copyOutput = useCallback(() => {
    if (!outputCode.trim()) {
      toast({ title: toolT.error, description: "Nothing to copy", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(outputCode).then(() => {
      toast({ title: toolT.success, description: toolT.copied });
    });
  }, [outputCode, toast, toolT]);

  const clearAll = useCallback(() => {
    setInputCode("");
    setOutputCode("");
    toast({ title: toolT.success, description: toolT.cleared });
  }, [toast, toolT]);

  const useOutputAsInput = useCallback(() => {
    if (!outputCode.trim()) {
      toast({ title: toolT.error, description: "No output to use", variant: "destructive" });
      return;
    }
    setInputCode(outputCode);
    setOutputCode("");
  }, [outputCode, toast, toolT]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{toolT.title}</h1>
            <p className="text-muted-foreground">{toolT.subtitle}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Options */}
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>{toolT.language}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="css">CSS</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{toolT.indentSize}</Label>
                <Select value={indentSize} onValueChange={setIndentSize}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Editors */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>{toolT.inputCode}</Label>
                <div className="border rounded-lg overflow-hidden">
                  <CodeMirror
                    value={inputCode}
                    height="350px"
                    theme={oneDark}
                    extensions={[getLanguageExtension()]}
                    onChange={(value) => setInputCode(value)}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLineGutter: true,
                      highlightSpecialChars: true,
                      foldGutter: true,
                      drawSelection: true,
                      dropCursor: true,
                      allowMultipleSelections: true,
                      indentOnInput: true,
                      syntaxHighlighting: true,
                      bracketMatching: true,
                      closeBrackets: true,
                      autocompletion: true,
                      rectangularSelection: true,
                      crosshairCursor: true,
                      highlightActiveLine: true,
                      highlightSelectionMatches: true,
                      closeBracketsKeymap: true,
                      defaultKeymap: true,
                      searchKeymap: true,
                      historyKeymap: true,
                      foldKeymap: true,
                      completionKeymap: true,
                      lintKeymap: true,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{toolT.outputCode}</Label>
                <div className="border rounded-lg overflow-hidden">
                  <CodeMirror
                    value={outputCode}
                    height="350px"
                    theme={oneDark}
                    extensions={[getLanguageExtension()]}
                    editable={false}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLineGutter: true,
                      highlightSpecialChars: true,
                      foldGutter: true,
                      drawSelection: true,
                      syntaxHighlighting: true,
                      bracketMatching: true,
                      highlightActiveLine: true,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={beautifyCode} className="bg-green-600 hover:bg-green-700">
                <Sparkles className="w-4 h-4 mr-2" />
                {toolT.beautify}
              </Button>
              <Button onClick={minifyCode} variant="secondary">
                <Minimize2 className="w-4 h-4 mr-2" />
                {toolT.minify}
              </Button>
              <Button onClick={useOutputAsInput} variant="outline">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                {toolT.useAsInput}
              </Button>
              <Button onClick={copyOutput} variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                {toolT.copy}
              </Button>
              <Button onClick={clearAll} variant="outline">
                <Trash2 className="w-4 h-4 mr-2" />
                {toolT.clear}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CodeBeautifier;
