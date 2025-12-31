import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StreamdownRenderer } from "./streamdown";

interface MarkdownEditorProps {
  frontMarkdown: string;
  backMarkdown: string;
  onFrontChange: (value: string) => void;
  onBackChange: (value: string) => void;
}

export function MarkdownEditor({
  frontMarkdown,
  backMarkdown,
  onFrontChange,
  onBackChange,
}: MarkdownEditorProps) {
  const [currentSide, setCurrentSide] = useState<"front" | "back">("front");

  const currentMarkdown = currentSide === "front" ? frontMarkdown : backMarkdown;
  const setCurrentMarkdown = currentSide === "front" ? onFrontChange : onBackChange;

  const handleFlipCard = () => {
    setCurrentSide(currentSide === "front" ? "back" : "front");
  };

  return (
    <>
      <div className="flex items-center justify-center gap-4">
        <Button onClick={handleFlipCard} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Flip Card ({currentSide === "front" ? "Back" : "Front"})
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Markdown Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[400px] font-mono"
              onChange={(e) => setCurrentMarkdown(e.target.value)}
              placeholder={`Enter ${currentSide} side content in Markdown...`}
              value={currentMarkdown}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[400px] rounded-md border bg-muted/20 p-4">
              {currentMarkdown.trim() ? (
                <StreamdownRenderer>{currentMarkdown}</StreamdownRenderer>
              ) : (
                <p className="text-muted-foreground italic">Preview will appear here...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
