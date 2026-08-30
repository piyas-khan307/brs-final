"use client";

/**
 * Milestone-1 prototype of the visual page builder described in the
 * project vision doc — deliberately its own route, not wired into the
 * event editor yet. See CanvasEditor.tsx's file comment for exact
 * scope and what's not here yet.
 */

import { CanvasEditor } from "@/components/admin/canvas/CanvasEditor";

export default function CanvasPrototypePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-heading-s text-text-primary">Canvas editor — prototype</h1>
        <p className="text-body-s text-text-secondary">
          Milestone 1: a bare-bones draggable, resizable canvas with text and image elements.
          Nothing here saves yet — this is for trying the interaction, not for building a real
          page.
        </p>
      </div>
      <CanvasEditor />
    </div>
  );
}
