import * as React from "react";
import { Button, type ButtonProps } from "./ui/button";
import { cn } from "../lib/utils";

interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  value: string;
  label?: string;
  copiedLabel?: string;
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied!",
  className,
  ...rest
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  React.useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(className)}
      {...rest}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
