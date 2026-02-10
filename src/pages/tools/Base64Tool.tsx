import { useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  FileCode2,
  Copy,
  Trash2,
  ArrowDownUp,
  Upload,
  Download,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

const Base64Tool = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Text tab state
  const [textInput, setTextInput] = useState("");
  const [textOutput, setTextOutput] = useState("");
  const [textMode, setTextMode] = useState<"encode" | "decode">("encode");
  
  // File tab state
  const [fileOutput, setFileOutput] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  
  // Image tab state
  const [imageOutput, setImageOutput] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [includeHeader, setIncludeHeader] = useState(true);
  
  // Decode to file state
  const [base64Input, setBase64Input] = useState("");
  const [outputFileName, setOutputFileName] = useState("");
  const [mimeType, setMimeType] = useState("");
  
  // Decode to image state
  const [imageBase64Input, setImageBase64Input] = useState("");
  const [decodedImagePreview, setDecodedImagePreview] = useState("");

  const toolT = {
    title: t.tools?.base64?.title || "Base64 Encoder & Decoder",
    subtitle: t.tools?.base64?.subtitle || "Encode and decode text, files, and images to/from Base64 format",
    textTab: t.tools?.base64?.textTab || "Text",
    fileTab: t.tools?.base64?.fileTab || "File",
    imageTab: t.tools?.base64?.imageTab || "Image",
    encode: t.tools?.base64?.encode || "Encode",
    decode: t.tools?.base64?.decode || "Decode",
    inputPlaceholder: t.tools?.base64?.inputPlaceholder || "Enter text to encode/decode...",
    outputPlaceholder: t.tools?.base64?.outputPlaceholder || "Result will appear here...",
    convert: t.tools?.base64?.convert || "Convert",
    copy: t.common?.copy || "Copy",
    clear: t.common?.clear || "Clear",
    copied: t.common?.copied || "Copied!",
    dragDrop: t.tools?.base64?.dragDrop || "Click or drag & drop a file here",
    maxSize: t.tools?.base64?.maxSize || "Max size: 5MB",
    convertToFile: t.tools?.base64?.convertToFile || "Convert to File",
    downloadFile: t.tools?.base64?.downloadFile || "Download File",
    base64ToFile: t.tools?.base64?.base64ToFile || "Base64 to File",
    base64ToImage: t.tools?.base64?.base64ToImage || "Base64 to Image",
    outputFilename: t.tools?.base64?.outputFilename || "Output Filename",
    mimeType: t.tools?.base64?.mimeType || "MIME Type (optional)",
    includeDataHeader: t.tools?.base64?.includeDataHeader || "Include data:image header",
    preview: t.tools?.base64?.preview || "Preview",
    downloadImage: t.tools?.base64?.downloadImage || "Download Image",
    enterBase64: t.tools?.base64?.enterBase64 || "Enter Base64 string...",
    success: t.messages?.success || "Success",
    error: t.messages?.error || "Error",
    fileTooLarge: t.tools?.base64?.fileTooLarge || "File is too large. Max size is 5MB",
    invalidBase64: t.tools?.base64?.invalidBase64 || "Invalid Base64 string",
    noContent: t.tools?.base64?.noContent || "No content to process",
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Text conversion
  const convertText = useCallback(() => {
    if (!textInput.trim()) {
      toast({ title: toolT.error, description: toolT.noContent, variant: "destructive" });
      return;
    }
    
    try {
      if (textMode === "encode") {
        const encoded = btoa(unescape(encodeURIComponent(textInput)));
        setTextOutput(encoded);
      } else {
        const decoded = decodeURIComponent(escape(atob(textInput)));
        setTextOutput(decoded);
      }
      toast({ title: toolT.success, description: `Text ${textMode}d successfully!` });
    } catch {
      toast({ title: toolT.error, description: toolT.invalidBase64, variant: "destructive" });
    }
  }, [textInput, textMode, toast, toolT]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    if (!text) {
      toast({ title: toolT.error, description: toolT.noContent, variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: toolT.success, description: toolT.copied });
    });
  }, [toast, toolT]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: toolT.error, description: toolT.fileTooLarge, variant: "destructive" });
      return;
    }
    
    setFileName(file.name);
    setFileSize(formatBytes(file.size));
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFileOutput(result);
    };
    reader.readAsDataURL(file);
  }, [toast, toolT]);

  // Handle image selection
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast({ title: toolT.error, description: "Please select an image file", variant: "destructive" });
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: toolT.error, description: "Image is too large. Max size is 2MB", variant: "destructive" });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      if (includeHeader) {
        setImageOutput(result);
      } else {
        setImageOutput(result.split(",")[1] || "");
      }
    };
    reader.readAsDataURL(file);
  }, [includeHeader, toast, toolT]);

  // Base64 to file download
  const downloadBase64AsFile = useCallback(() => {
    if (!base64Input.trim()) {
      toast({ title: toolT.error, description: toolT.noContent, variant: "destructive" });
      return;
    }
    if (!outputFileName.trim()) {
      toast({ title: toolT.error, description: "Please enter output filename", variant: "destructive" });
      return;
    }
    
    try {
      let base64Data = base64Input;
      let detectedMimeType = mimeType || "application/octet-stream";
      
      if (base64Input.includes(",")) {
        const parts = base64Input.split(",");
        base64Data = parts[1];
        const match = parts[0].match(/data:([^;]+)/);
        if (match) detectedMimeType = match[1];
      }
      
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: detectedMimeType });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outputFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: toolT.success, description: "File downloaded successfully!" });
    } catch {
      toast({ title: toolT.error, description: toolT.invalidBase64, variant: "destructive" });
    }
  }, [base64Input, outputFileName, mimeType, toast, toolT]);

  // Base64 to image preview
  const previewBase64Image = useCallback(() => {
    if (!imageBase64Input.trim()) {
      toast({ title: toolT.error, description: toolT.noContent, variant: "destructive" });
      return;
    }
    
    try {
      let imageSrc = imageBase64Input;
      if (!imageBase64Input.startsWith("data:image")) {
        imageSrc = `data:image/png;base64,${imageBase64Input}`;
      }
      setDecodedImagePreview(imageSrc);
      toast({ title: toolT.success, description: "Image decoded successfully!" });
    } catch {
      toast({ title: toolT.error, description: toolT.invalidBase64, variant: "destructive" });
    }
  }, [imageBase64Input, toast, toolT]);

  // Download decoded image
  const downloadDecodedImage = useCallback(() => {
    if (!decodedImagePreview) return;
    
    const a = document.createElement("a");
    a.href = decodedImagePreview;
    a.download = "decoded-image.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [decodedImagePreview]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <FileCode2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{toolT.title}</h1>
            <p className="text-muted-foreground">{toolT.subtitle}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="text" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text" className="gap-2">
                  <FileText className="w-4 h-4" />
                  {toolT.textTab}
                </TabsTrigger>
                <TabsTrigger value="file" className="gap-2">
                  <Upload className="w-4 h-4" />
                  {toolT.fileTab}
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {toolT.imageTab}
                </TabsTrigger>
              </TabsList>

              {/* Text Tab */}
              <TabsContent value="text" className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={textMode === "encode" ? "default" : "outline"}
                    onClick={() => setTextMode("encode")}
                  >
                    {toolT.encode}
                  </Button>
                  <Button
                    variant={textMode === "decode" ? "default" : "outline"}
                    onClick={() => setTextMode("decode")}
                  >
                    {toolT.decode}
                  </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{textMode === "encode" ? "Text Input" : "Base64 Input"}</Label>
                    <Textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={toolT.inputPlaceholder}
                      className="min-h-[200px] font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{textMode === "encode" ? "Base64 Output" : "Text Output"}</Label>
                    <Textarea
                      value={textOutput}
                      readOnly
                      placeholder={toolT.outputPlaceholder}
                      className="min-h-[200px] font-mono bg-muted"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button onClick={convertText}>
                    <ArrowDownUp className="w-4 h-4 mr-2" />
                    {toolT.convert}
                  </Button>
                  <Button variant="outline" onClick={() => copyToClipboard(textOutput)}>
                    <Copy className="w-4 h-4 mr-2" />
                    {toolT.copy}
                  </Button>
                  <Button variant="outline" onClick={() => { setTextInput(""); setTextOutput(""); }}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {toolT.clear}
                  </Button>
                </div>
              </TabsContent>

              {/* File Tab */}
              <TabsContent value="file" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">File to Base64</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => document.getElementById("fileInput")?.click()}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">{toolT.dragDrop}</p>
                      <p className="text-sm text-muted-foreground">{toolT.maxSize}</p>
                      <input
                        id="fileInput"
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>
                    
                    {fileName && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="font-medium">{fileName}</p>
                        <p className="text-sm text-muted-foreground">{fileSize}</p>
                      </div>
                    )}
                    
                    {fileOutput && (
                      <div className="space-y-2">
                        <Label>Base64 Output</Label>
                        <Textarea
                          value={fileOutput}
                          readOnly
                          className="min-h-[150px] font-mono bg-muted text-xs"
                        />
                        <Button variant="outline" onClick={() => copyToClipboard(fileOutput)}>
                          <Copy className="w-4 h-4 mr-2" />
                          {toolT.copy}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{toolT.base64ToFile}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Base64 Input</Label>
                      <Textarea
                        value={base64Input}
                        onChange={(e) => setBase64Input(e.target.value)}
                        placeholder={toolT.enterBase64}
                        className="min-h-[100px] font-mono"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{toolT.outputFilename}</Label>
                        <Input
                          value={outputFileName}
                          onChange={(e) => setOutputFileName(e.target.value)}
                          placeholder="output.pdf"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{toolT.mimeType}</Label>
                        <Input
                          value={mimeType}
                          onChange={(e) => setMimeType(e.target.value)}
                          placeholder="application/pdf"
                        />
                      </div>
                    </div>
                    <Button onClick={downloadBase64AsFile}>
                      <Download className="w-4 h-4 mr-2" />
                      {toolT.downloadFile}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Image Tab */}
              <TabsContent value="image" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Image to Base64</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => document.getElementById("imageInput")?.click()}
                    >
                      <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">{toolT.dragDrop}</p>
                      <p className="text-sm text-muted-foreground">Max size: 2MB (Images only)</p>
                      <input
                        id="imageInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </div>
                    
                    {imagePreview && (
                      <div className="flex justify-center">
                        <img src={imagePreview} alt="Preview" className="max-w-[300px] max-h-[300px] rounded-lg border" />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeHeader"
                        checked={includeHeader}
                        onChange={(e) => setIncludeHeader(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="includeHeader">{toolT.includeDataHeader}</Label>
                    </div>
                    
                    {imageOutput && (
                      <div className="space-y-2">
                        <Label>Base64 Output</Label>
                        <Textarea
                          value={imageOutput}
                          readOnly
                          className="min-h-[100px] font-mono bg-muted text-xs"
                        />
                        <Button variant="outline" onClick={() => copyToClipboard(imageOutput)}>
                          <Copy className="w-4 h-4 mr-2" />
                          {toolT.copy}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{toolT.base64ToImage}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Base64 Input</Label>
                      <Textarea
                        value={imageBase64Input}
                        onChange={(e) => setImageBase64Input(e.target.value)}
                        placeholder={toolT.enterBase64}
                        className="min-h-[100px] font-mono"
                      />
                    </div>
                    <Button onClick={previewBase64Image}>
                      {toolT.preview}
                    </Button>
                    
                    {decodedImagePreview && (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <img src={decodedImagePreview} alt="Decoded" className="max-w-[300px] max-h-[300px] rounded-lg border" />
                        </div>
                        <Button variant="outline" onClick={downloadDecodedImage}>
                          <Download className="w-4 h-4 mr-2" />
                          {toolT.downloadImage}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Base64Tool;
