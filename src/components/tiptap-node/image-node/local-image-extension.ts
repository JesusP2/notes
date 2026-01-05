import { Image } from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { LocalImageComponent } from "./local-image-component";

export const LocalImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(LocalImageComponent);
  },
});

export default LocalImage;
