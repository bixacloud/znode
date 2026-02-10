import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/contexts/SiteContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ExternalLink, Save } from "lucide-react";

import grapesjs, { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";

import gjsPresetWebpage from "grapesjs-preset-webpage";
import gjsBlocksBasic from "grapesjs-blocks-basic";
import gjsPluginForms from "grapesjs-plugin-forms";
import gjsNavbar from "grapesjs-navbar";
import gjsCountdown from "grapesjs-component-countdown";
import gjsStyleGradient from "grapesjs-style-gradient";
import gjsStyleBg from "grapesjs-style-bg";
import gjsBlocksFlexbox from "grapesjs-blocks-flexbox";
import gjsTabs from "grapesjs-tabs";
import gjsTooltip from "grapesjs-tooltip";
import gjsCustomCode from "grapesjs-custom-code";
import gjsTouch from "grapesjs-touch";
import gjsPluginExport from "grapesjs-plugin-export";
import gjsTyped from "grapesjs-typed";
import gjsParserPostcss from "grapesjs-parser-postcss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

const WebsiteBuilder = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const builderT = (t.hosting?.builder || {}) as Record<string, string>;
  usePageTitle(builderT.title || "Website Builder");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [domain, setDomain] = useState("");
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Save handler (defined inline for the command)
  const saveProject = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const projectData = editor.getProjectData();
      const html = editor.getHtml();
      const css = editor.getCss();

      const res = await fetch(`${API_URL}/api/builder/${username}/project`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectData, html, css }),
      });

      const result = await res.json();
      if (result.success) {
        toast({
          title: builderT.saved || "Saved",
          description: builderT.savedDesc || "Project saved & published!",
        });
      } else {
        throw new Error(result.error || "Save failed");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [username, toast, builderT]);

  // Initialize GrapesJS
  useEffect(() => {
    if (!containerRef.current) return;

    let editor: Editor | null = null;
    let destroyed = false;

    const init = async () => {
      // Load project data first
      let data: { domain?: string; project?: Record<string, unknown> } | null = null;
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${API_URL}/api/builder/${username}/project`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) data = await res.json();
      } catch {
        // ignore
      }

      if (destroyed) return;
      if (data?.domain) setDomain(data.domain);

      // Initialize GrapesJS directly on the container div
      editor = grapesjs.init({
        container: containerRef.current!,
        height: "100%",
        width: "100%",
        storageManager: false,
        canvas: {
          styles: [
            "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
          ],
          scripts: [
            "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js",
          ],
        },
        plugins: [
          gjsPresetWebpage,
          gjsBlocksBasic,
          gjsPluginForms,
          gjsNavbar,
          gjsCountdown,
          gjsStyleGradient,
          gjsStyleBg,
          gjsBlocksFlexbox,
          gjsTabs,
          gjsTooltip,
          gjsCustomCode,
          gjsTouch,
          gjsPluginExport,
          gjsTyped,
          gjsParserPostcss,
        ],
        pluginsOpts: {
          "grapesjs-preset-webpage": {
            modalImportTitle: "Import Template",
            modalImportButton: "Import",
          },
          "grapesjs-blocks-basic": {
            flexGrid: true,
          },
          "grapesjs-plugin-export": {
            addExportBtn: true,
          },
          "grapesjs-typed": {
            block: {
              category: "Extra",
              content: {
                type: "typed",
                "type-speed": 40,
                strings: ["Text row one", "Text row two", "Text row three"],
              },
            },
          },
        },
      });

      editorRef.current = editor;

      // Load existing project
      if (data?.project && Object.keys(data.project).length > 0) {
        editor.loadProjectData(data.project);
      }

      // Load assets
      try {
        const token = localStorage.getItem("accessToken");
        const assetsRes = await fetch(
          `${API_URL}/api/builder/${username}/assets`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const assetsData = await assetsRes.json();
        if (assetsData.assets?.length) {
          editor.AssetManager.add(assetsData.assets);
        }
      } catch {
        // ignore
      }

      // Add save button to GrapesJS toolbar
      editor.Panels.addButton("options", {
        id: "save-project",
        className: "fa fa-floppy-o",
        command: "save-project",
        attributes: { title: "Save & Publish" },
      });

      editor.Commands.add("save-project", {
        run: () => saveProject(),
      });

      setIsLoading(false);
    };

    init();

    // Keyboard shortcut
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveProject();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      destroyed = true;
      document.removeEventListener("keydown", onKeyDown);
      if (editor) editor.destroy();
      editorRef.current = null;
    };
  }, [username, saveProject]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">
              {builderT.loading || "Loading Website Builder..."}
            </p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shadow-sm z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/user/hosting/${username}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {builderT.backToHosting || "Back to Hosting"}
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            {builderT.editingFor || "Editing"}:{" "}
            <strong className="text-foreground">{domain}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={saveProject}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            {builderT.savePublish || "Save & Publish"}
          </Button>
          {domain && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`http://${domain}`, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              {builderT.viewSite || "View Site"}
            </Button>
          )}
        </div>
      </div>

      {/* GrapesJS Editor Container - always rendered so ref is available */}
      <div className="flex-1 overflow-hidden" ref={containerRef} />
    </div>
  );
};

export default WebsiteBuilder;
