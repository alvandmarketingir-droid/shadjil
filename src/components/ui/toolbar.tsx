"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Bold,
  Italic,
  Heading,
  Quote,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Underline,
  Strikethrough,
} from "lucide-react"
import { useState } from "react"

/** لینک عمداً حذف شده — فقط برای UI ادمین؛ کنترل واقعی در ادیتور مرحله بعد */

const ToolbarButton = ({
  label,
  icon: Icon,
  isActive,
  onClick,
  tooltip,
  showTooltip,
  hideTooltip,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  onClick: () => void
  tooltip: string | null
  showTooltip: (label: string) => void
  hideTooltip: () => void
}) => (
  <div
    className="relative"
    onMouseEnter={() => showTooltip(label)}
    onMouseLeave={hideTooltip}
  >
    <button
      type="button"
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-200 hover:bg-primary-foreground/15 focus:outline-none ${
        isActive ? "bg-primary-foreground/20" : ""
      }`}
      aria-label={label}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </button>
    {tooltip === label && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-nowrap text-white shadow-lg"
      >
        {label}
      </motion.div>
    )}
  </div>
)

const Toolbar = () => {
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    "right",
  )
  const [activeButtons, setActiveButtons] = useState<string[]>([])
  const [tooltip, setTooltip] = useState<string | null>(null)

  const toggleActiveButton = (button: string) => {
    setActiveButtons((prev) =>
      prev.includes(button)
        ? prev.filter((b) => b !== button)
        : [...prev, button],
    )
  }

  return (
    <div className="relative flex min-h-[80px] w-full items-center justify-center rounded-lg p-2">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-primary text-primary-foreground border-primary/20 absolute z-50 flex items-center gap-1 rounded-lg border p-1 shadow-lg"
        >
          <ToolbarButton
            label="پروضعیت محصول"
            icon={Bold}
            isActive={activeButtons.includes("bold")}
            onClick={() => toggleActiveButton("bold")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
          <ToolbarButton
            label="کج"
            icon={Italic}
            isActive={activeButtons.includes("italic")}
            onClick={() => toggleActiveButton("italic")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
          <ToolbarButton
            label="زیرخط"
            icon={Underline}
            isActive={activeButtons.includes("underline")}
            onClick={() => toggleActiveButton("underline")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
          <ToolbarButton
            label="خط‌خورده"
            icon={Strikethrough}
            isActive={activeButtons.includes("strikethrough")}
            onClick={() => toggleActiveButton("strikethrough")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
          <ToolbarButton
            label="عنوان"
            icon={Heading}
            isActive={activeButtons.includes("heading")}
            onClick={() => toggleActiveButton("heading")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
          <ToolbarButton
            label="نقل‌قول"
            icon={Quote}
            isActive={activeButtons.includes("quote")}
            onClick={() => toggleActiveButton("quote")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
          <div className="h-8 w-px bg-gray-300" />
          <ToolbarButton
            label="هایلایت"
            icon={Highlighter}
            isActive={activeButtons.includes("highlight")}
            onClick={() => toggleActiveButton("highlight")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
          <ToolbarButton
            label="وضعیت محصول"
            icon={Palette}
            isActive={activeButtons.includes("roast")}
            onClick={() => toggleActiveButton("roast")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
          <div className="h-8 w-px bg-gray-300" />
          <ToolbarButton
            label="چپ"
            icon={AlignLeft}
            isActive={textAlign === "left"}
            onClick={() => setTextAlign("left")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
          <ToolbarButton
            label="وسط"
            icon={AlignCenter}
            isActive={textAlign === "center"}
            onClick={() => setTextAlign("center")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
          <ToolbarButton
            label="راست"
            icon={AlignRight}
            isActive={textAlign === "right"}
            onClick={() => setTextAlign("right")}
            tooltip={tooltip}
            showTooltip={setTooltip}
            hideTooltip={() => setTooltip(null)}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export { Toolbar }
