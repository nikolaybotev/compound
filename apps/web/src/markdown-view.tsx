import type { ComponentChildren } from "preact";
import { resolveKnowledgeHref } from "./knowledge";
import {
  type Block,
  type Inline,
  type ListBlock,
  parseMarkdown,
} from "./markdown";

export function MarkdownView(props: { source: string; onHref: (href: string) => void }) {
  const blocks = parseMarkdown(props.source);
  return <div class="knowledge-md">{blocks.map((block, index) => renderBlock(block, index, props.onHref))}</div>;
}

function renderBlock(block: Block, key: number, onHref: (href: string) => void): ComponentChildren {
  switch (block.kind) {
    case "anchor":
      return <span id={block.id} class="knowledge-anchor" key={key} />;
    case "heading": {
      const content = renderInlines(block.children, onHref);
      if (block.level <= 1) return <h2 key={key}>{content}</h2>;
      if (block.level === 2) return <h3 key={key}>{content}</h3>;
      return <h4 key={key}>{content}</h4>;
    }
    case "paragraph":
      return <p key={key}>{renderInlines(block.children, onHref)}</p>;
    case "quote":
      return (
        <blockquote key={key}>
          {block.blocks.map((child, index) => renderBlock(child, index, onHref))}
        </blockquote>
      );
    case "list":
      return renderList(block, key, onHref);
    case "table":
      return (
        <div class="knowledge-table-scroll" key={key}>
          <table>
            {block.header.length > 0 ? (
              <thead>
                <tr>
                  {block.header.map((cell, index) => (
                    <th key={index} scope="col">{renderInlines(cell, onHref)}</th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td key={index}>{renderInlines(cell, onHref)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function renderList(block: ListBlock, key: number, onHref: (href: string) => void) {
  const items = block.items.map((item, index) => (
    <li key={index}>
      {renderInlines(item.children, onHref)}
      {item.nested ? renderList(item.nested, index + 1, onHref) : null}
    </li>
  ));
  if (block.ordered) return <ol key={key} start={block.start}>{items}</ol>;
  return <ul key={key}>{items}</ul>;
}

function renderInlines(nodes: Inline[], onHref: (href: string) => void): ComponentChildren {
  return nodes.map((node, index) => renderInline(node, index, onHref));
}

function renderInline(node: Inline, key: number, onHref: (href: string) => void): ComponentChildren {
  switch (node.kind) {
    case "text":
      return node.text;
    case "strong":
      return <strong key={key}>{renderInlines(node.children, onHref)}</strong>;
    case "em":
      return <em key={key}>{renderInlines(node.children, onHref)}</em>;
    case "code":
      return <code key={key}>{node.text}</code>;
    case "link": {
      const resolved = resolveKnowledgeHref(node.href);
      const children = renderInlines(node.children, onHref);
      if (resolved.kind === "external") {
        return (
          <a key={key} href={resolved.href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      }
      if (resolved.kind === "stay") return <span key={key}>{children}</span>;
      return (
        <button key={key} type="button" class="term" onClick={() => onHref(node.href)}>
          {children}
        </button>
      );
    }
  }
}
