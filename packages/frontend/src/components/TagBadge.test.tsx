import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagBadge } from "./TagBadge";

describe("TagBadge", () => {
  it("renders group tag label", () => {
    const tag = {
      id: "pt-1",
      passengerId: "p-1",
      groupTagId: "gt-1",
      groupTag: { id: "gt-1", groupId: "g-1", label: "Musique", createdAt: "" },
    };
    render(<TagBadge tag={tag} />);
    expect(screen.getByText("Musique")).toBeInTheDocument();
  });

  it("renders free text tag", () => {
    const tag = {
      id: "pt-2",
      passengerId: "p-1",
      freeText: "Détour gare",
    };
    render(<TagBadge tag={tag} />);
    expect(screen.getByText("Détour gare")).toBeInTheDocument();
  });

  it("shows remove button when onRemove is provided", () => {
    const tag = { id: "pt-1", passengerId: "p-1", freeText: "Test" };
    render(<TagBadge tag={tag} onRemove={() => {}} />);
    expect(screen.getByTitle("Supprimer le tag")).toBeInTheDocument();
  });

  it("does not show remove button when onRemove is not provided", () => {
    const tag = { id: "pt-1", passengerId: "p-1", freeText: "Test" };
    render(<TagBadge tag={tag} />);
    expect(screen.queryByTitle("Supprimer le tag")).not.toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    const tag = { id: "pt-1", passengerId: "p-1", freeText: "Test" };
    render(<TagBadge tag={tag} onRemove={onRemove} />);

    fireEvent.click(screen.getByTitle("Supprimer le tag"));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
