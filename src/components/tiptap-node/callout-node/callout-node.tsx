import { useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { CalloutType } from "./callout-node-extension";
import { InfoIcon, AlertTriangleIcon, LightbulbIcon, AlertCircleIcon, ChevronDownIcon } from "lucide-react";
import "./callout-node.scss";

export const CALLOUT_CONFIG: Record<
  CalloutType,
  { icon: typeof InfoIcon; label: string }
> = {
  info: { icon: InfoIcon, label: "Info" },
  warning: { icon: AlertTriangleIcon, label: "Warning" },
  tip: { icon: LightbulbIcon, label: "Tip" },
  danger: { icon: AlertCircleIcon, label: "Danger" },
};

export const CalloutNodeComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const type = node.attrs.type as CalloutType;
  const config = CALLOUT_CONFIG[type];
  const Icon = config.icon;

  const handleTypeChange = (newType: CalloutType) => {
    updateAttributes({ type: newType });
    setShowDropdown(false);
  };

  return (
    <NodeViewWrapper className={`callout-node callout-node-${type}`} data-callout-type={type}>
      <div className="callout-node-header" contentEditable={false}>
        <div className="callout-node-type-selector">
          <button
            type="button"
            className="callout-node-type-button"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Icon className="callout-node-icon" />
            <ChevronDownIcon className="callout-node-chevron" />
          </button>
          {showDropdown && (
            <div className="callout-node-dropdown">
              {(Object.keys(CALLOUT_CONFIG) as CalloutType[]).map((t) => {
                const TypeIcon = CALLOUT_CONFIG[t].icon;
                return (
                  <button
                    key={t}
                    type="button"
                    className={`callout-node-dropdown-item ${type === t ? "active" : ""}`}
                    onClick={() => handleTypeChange(t)}
                  >
                    <TypeIcon className="callout-node-dropdown-icon" />
                    {CALLOUT_CONFIG[t].label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <NodeViewContent className="callout-node-content" />
    </NodeViewWrapper>
  );
};
