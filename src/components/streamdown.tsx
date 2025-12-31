"use client";

import { type ComponentProps, memo } from "react";
import rehypeRaw from "rehype-raw";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type StreamdownProps = ComponentProps<typeof Streamdown>;

export const StreamdownRenderer = memo(
	({ className, ...props }: StreamdownProps) => (
		<Streamdown
			className={cn(
				"size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
				className,
			)}
			rehypePlugins={[rehypeRaw]}
			{...props}
		/>
	),
	(prevProps, nextProps) => prevProps.children === nextProps.children,
);

StreamdownRenderer.displayName = "Response";
