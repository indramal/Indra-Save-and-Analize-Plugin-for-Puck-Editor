/**
 * Indra Save & Analyze Plugin for Puck Editor
 *
 * A plugin for the Puck visual editor that allows saving pages and blocks as JSX,
 * and provides DOM/Component analysis tools.
 *
 * @author Indramal Wansekara
 * @link https://github.com/indramal/Indra-Save-and-Analize-Plugin-for-Puck-Editor/
 *
 * Please keep credit to the author when using this plugin.
 */

import React, { useEffect, useState } from "react";
import { ActionBar, usePuck } from "@measured/puck";

export const generateSource = (data) => {
  const { content, zones } = data;

  const renderItems = (items, indent = 4) => {
    return items
      .map((item) => {
        const { type, props } = item;
        const { id, ...cleanProps } = props || {};

        // Format props
        const propsString = Object.entries(cleanProps)
          .map(([key, value]) => {
            if (value === undefined) return "";
            if (typeof value === "string") return `${key}="${value}"`;
            if (typeof value === "boolean")
              return value ? key : `${key}={false}`;
            return `${key}={${JSON.stringify(value)}}`;
          })
          .filter(Boolean)
          .join(" ");

        // Check for child zones
        const itemZoneKeys = Object.keys(zones || {}).filter((key) =>
          key.startsWith(`${id}:`)
        );

        if (itemZoneKeys.length > 0) {
          const children = itemZoneKeys
            .map((zoneKey) => {
              return renderItems((zones || {})[zoneKey], indent + 2);
            })
            .join("\n");

          return `${" ".repeat(indent)}<${type}${
            propsString ? " " + propsString : ""
          }>\n${children}\n${" ".repeat(indent)}</${type}>`;
        } else {
          return `${" ".repeat(indent)}<${type}${
            propsString ? " " + propsString : ""
          } />`;
        }
      })
      .join("\n");
  };

  return `export default function Page() {\n  return (\n    <>\n${renderItems(
    content
  )}\n    </>\n  );\n}`;
};

export const generateBlockSource = (
  block,
  zones = {},
  useDynamicProps = false
) => {
  const renderItems = (items, indent = 4, useProps = false) => {
    return items
      .map((item) => {
        const { type, props } = item;
        const { id, ...cleanProps } = props || {};

        const propsString = Object.entries(cleanProps)
          .map(([key, value]) => {
            if (useProps) {
              return `${key}={props.${key}}`;
            }

            if (value === undefined) return "";
            if (typeof value === "string") return `${key}="${value}"`;
            if (typeof value === "boolean")
              return value ? key : `${key}={false}`;
            return `${key}={${JSON.stringify(value)}}`;
          })
          .filter(Boolean)
          .join(" ");

        const itemZoneKeys = Object.keys(zones || {}).filter((key) =>
          key.startsWith(`${id}:`)
        );

        if (itemZoneKeys.length > 0) {
          const children = itemZoneKeys
            .map((zoneKey) => {
              return renderItems((zones || {})[zoneKey], indent + 2);
            })
            .join("\n");

          return `${" ".repeat(indent)}<${type}${
            propsString ? " " + propsString : ""
          }>\n${children}\n${" ".repeat(indent)}</${type}>`;
        } else {
          return `${" ".repeat(indent)}<${type}${
            propsString ? " " + propsString : ""
          } />`;
        }
      })
      .join("\n");
  };

  return `export default function ${block.type || "Component"}(props) {\n  return (\n    <>\n${renderItems(
    [block],
    4,
    useDynamicProps
  )}\n    </>\n  );\n}`;
};

export const SaveBlock = (props) => {
  const { appState } = usePuck();

  const handleSave = (e, useProps) => {
    e.preventDefault();
    const { itemSelector } = appState.ui;

    if (itemSelector) {
      const { index, zone } = itemSelector;

      // Helper to get the correct content array
      // Puck uses 'root:default-zone' for the main content array
      const container =
        !zone || zone === "root:default-zone"
          ? appState.data.content
          : appState.data.zones?.[zone];

      const item = container?.[index];

      if (item) {
        console.log("Saving block:", item);
        const source = generateBlockSource(item, appState.data.zones, useProps);
        console.log(
          useProps
            ? "Saving block source (Props):"
            : "Saving block source (Values):",
          "\n",
          source
        );

        if (props.path) {
          const blockName = item.type || "Component";
          // Simple sanitization
          const filename = `${blockName.replace(/[\/\\:*?"<>|]/g, "")}.jsx`;
          const filePath = `${props.path}${filename}`;

          fetch("/api/save-jsx", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filePath,
              content: source,
            }),
          })
            .then((res) => {
              if (res.ok) {
                alert(`Saved block to ${filePath}`);
              } else {
                alert("Failed to save block");
              }
            })
            .catch((err) => {
              console.error(err);
              alert("Error saving block");
            });
        }
      } else {
        console.warn("SaveBlock: Item not found.", {
          itemSelector,
          zone,
          index,
        });
      }
    }
  };

  return (
    <>
      <style>
        {`
          .btnsave {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0 8px;
            font-weight: bold;
            transition: color 0.2s ease;
          }

          .btnsave:hover {
            color: #2196f3;
          }
        `}
      </style>
      <button
        onClick={(e) => handleSave(e, false)}
        className="btnsave"
        type="button"
      >
        Save W Values
      </button>
      <button
        onClick={(e) => handleSave(e, true)}
        className="btnsave"
        type="button"
      >
        Save W Props
      </button>
    </>
  );
};

const SavePageButton = (props) => {
  const { appState } = usePuck();
  const handleSave = (e) => {
    e.preventDefault();
    if (appState?.data?.content) {
      const source = generateSource(appState.data);
      console.log(" Generated JSX Source:\n", source);

      if (props.path) {
        const title = appState.data.root.props.title || "Untitled Page";
        const filename = `${title.replace(/[\/\\:*?"<>|]/g, "")}.jsx`;
        const filePath = `${props.path}${filename}`;

        fetch("/api/save-jsx", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filePath,
            content: source,
          }),
        })
          .then((res) => {
            if (res.ok) {
              alert(`Saved page to ${filePath}`);
            } else {
              alert("Failed to save page");
            }
          })
          .catch((err) => {
            console.error(err);
            alert("Error saving page");
          });
      }
    }
  };

  return (
    <button
      onClick={handleSave}
      type="button"
      className="_Button_10byl_1 _Button--primary_10byl_48 _Button--medium_10byl_29"
    >
      <div className="_Button-icon_10byl_44">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14px"
          height="14px"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="M21 7v12q0 .825-.587 1.413T19 21H5q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h12zm-9 11q1.25 0 2.125-.875T15 15t-.875-2.125T12 12t-2.125.875T9 15t.875 2.125T12 18m-6-8h9V6H6z"
          />
        </svg>
      </div>
      Save Page
    </button>
  );
};

const TreeView = () => {
  const [tree, setTree] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(null);

  // Helper to find the correct iframe (the one with Puck content)
  const findPuckIframe = () => {
    const iframes = document.querySelectorAll("iframe");
    // Try to find an iframe that has a body with children
    for (const iframe of iframes) {
      try {
        if (iframe.contentDocument && iframe.contentDocument.body) {
          // If it has children or looks like the puck frame (usually has ID or class)
          // We'll return the first one that is accessible
          return iframe;
        }
      } catch (e) {
        // Ignore cross-origin frames
      }
    }
    return null;
  };

  const buildTree = (node) => {
    // Text nodes (Type 3)
    if (node.nodeType === 3) {
      const text = node.textContent?.trim();
      if (!text) return null;
      return { type: "text", content: text };
    }

    // Element nodes (Type 1)
    if (node.nodeType !== 1) return null;

    // Filter out internal scripts/styles/meta to keep it clean
    const tagName = node.tagName;
    if (
      ["SCRIPT", "STYLE", "LINK", "META", "TITLE", "NOSCRIPT"].includes(tagName)
    )
      return null;

    const children = Array.from(node.childNodes).map(buildTree).filter(Boolean);

    let className = "";
    try {
      if (typeof node.className === "string") {
        className = node.className;
      } else if (node.className && typeof node.className.baseVal === "string") {
        className = node.className.baseVal;
      }
    } catch (e) {}

    return {
      type: "element",
      tagName: tagName.toLowerCase(),
      id: node.id,
      className: className,
      children,
    };
  };

  const updateTree = (iframe) => {
    if (!iframe?.contentDocument?.body) return;
    try {
      const newTree = buildTree(iframe.contentDocument.body);
      setTree(newTree);
      setError(null);
    } catch (err) {
      console.error("Error building tree:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    let observer;
    let pollInterval;
    let currentIframe = null;

    const init = () => {
      const iframe = findPuckIframe();
      if (iframe && iframe.contentDocument?.body) {
        currentIframe = iframe;
        updateTree(iframe);

        // Disconnect old observer if any
        if (observer) observer.disconnect();

        observer = new MutationObserver(() => updateTree(iframe));
        observer.observe(iframe.contentDocument.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
        return true;
      }
      return false;
    };

    // Initial attempt
    if (!init()) {
      pollInterval = setInterval(init, 1000);
    }

    // Re-check periodically in case iframe reloads
    const robustnessInterval = setInterval(() => {
      if (!currentIframe || !currentIframe.isConnected) {
        init();
      }
    }, 2000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (robustnessInterval) clearInterval(robustnessInterval);
      if (observer) observer.disconnect();
    };
  }, []);

  const renderNode = (node, i) => {
    if (!node) return null;

    if (node.type === "text") {
      return (
        <div
          key={i}
          style={{
            paddingLeft: "12px",
            color: "#666",
            fontSize: "11px",
            whiteSpace: "pre-wrap",
          }}
        >
          "{node.content}"
        </div>
      );
    }

    // Element
    const hasChildren = node.children && node.children.length > 0;
    const isVoid = [
      "area",
      "base",
      "br",
      "col",
      "embed",
      "hr",
      "img",
      "input",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr",
    ].includes(node.tagName);

    return (
      <div
        key={i}
        style={{
          paddingLeft: "12px",
          lineHeight: "1.5",
          fontSize: "12px",
          fontFamily: "Consolas, Monaco, 'Andale Mono', monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            flexWrap: "wrap",
            color: "#444",
          }}
        >
          <span style={{ color: "#a90d9e" }}>&lt;{node.tagName}</span>
          {node.id && (
            <span style={{ color: "#1a1aa6" }}>
              {" "}
              <span style={{ color: "#888" }}>id=</span>"{node.id}"
            </span>
          )}
          {node.className && (
            <span style={{ color: "#1a1aa6" }}>
              {" "}
              <span style={{ color: "#888" }}>class=</span>"{node.className}"
            </span>
          )}
          <span style={{ color: "#a90d9e" }}>{isVoid ? " />" : ">"}</span>
        </div>

        {hasChildren && !collapsed && (
          <div style={{ borderLeft: "1px dotted #ccc", marginLeft: "4px" }}>
            {node.children.map((child, idx) => renderNode(child, idx))}
          </div>
        )}

        {!isVoid && (
          <div style={{ color: "#a90d9e" }}>&lt;/{node.tagName}&gt;</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 20, borderTop: "1px solid #eee", paddingTop: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <h4
          style={{ fontSize: "14px", fontWeight: 600, margin: 0, margin: 10 }}
        >
          DOM Structure
        </h4>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              const iframe = findPuckIframe();
              if (iframe) updateTree(iframe);
            }}
            className="_Button_10byl_1 _Button--primary_10byl_48 _Button--medium_10byl_29"
            type="button"
          >
            Refresh
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              setCollapsed(!collapsed);
            }}
            type="button"
            className="_Button_10byl_1 _Button--primary_10byl_48 _Button--medium_10byl_29"
            // style={{ marginLeft: "8px" }}
          >
            <div className="_Button-icon_10byl_44">
              {collapsed ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14px"
                  height="14px"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14px"
                  height="14px"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                </svg>
              )}
            </div>
            {/* {collapsed ? "Expand" : "Collapse"} */}
          </button>
        </div>
      </div>
      <div
        style={{
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
          overflowX: "auto",
          background: "#f8f9fa",
          padding: "8px",
          borderRadius: "4px",
        }}
      >
        {error && <div style={{ color: "red", fontSize: "11px" }}>{error}</div>}
        {tree ? renderNode(tree, 0) : "Loading DOM..."}
      </div>
    </div>
  );
};

const DOMOutline = () => {
  const [tree, setTree] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState(null);

  const findPuckIframe = () => {
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      try {
        if (iframe.contentDocument && iframe.contentDocument.body) {
          return iframe;
        }
      } catch (e) {}
    }
    return null;
  };

  const buildTree = (node) => {
    if (node.nodeType === 3) {
      const text = node.textContent?.trim();
      if (!text) return null;
      return { type: "text", content: text };
    }

    if (node.nodeType !== 1) return null;

    const tagName = node.tagName;
    if (
      ["SCRIPT", "STYLE", "LINK", "META", "TITLE", "NOSCRIPT"].includes(tagName)
    )
      return null;

    const children = Array.from(node.childNodes).map(buildTree).filter(Boolean);

    let className = "";
    try {
      if (typeof node.className === "string") {
        className = node.className;
      } else if (node.className && typeof node.className.baseVal === "string") {
        className = node.className.baseVal;
      }
    } catch (e) {}

    return {
      type: "element",
      tagName: tagName.toLowerCase(),
      id: node.id,
      className: className,
      children,
    };
  };

  const updateTree = (iframe) => {
    if (!iframe?.contentDocument?.body) return;
    try {
      const newTree = buildTree(iframe.contentDocument.body);
      setTree(newTree);
      setError(null);
    } catch (err) {
      console.error("Error building tree:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    let observer;
    let pollInterval;
    let currentIframe = null;

    const init = () => {
      const iframe = findPuckIframe();
      if (iframe && iframe.contentDocument?.body) {
        currentIframe = iframe;
        updateTree(iframe);
        if (observer) observer.disconnect();
        observer = new MutationObserver(() => updateTree(iframe));
        observer.observe(iframe.contentDocument.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
        return true;
      }
      return false;
    };

    if (!init()) {
      pollInterval = setInterval(init, 1000);
    }

    const robustnessInterval = setInterval(() => {
      if (!currentIframe || !currentIframe.isConnected) {
        init();
      }
    }, 2000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (robustnessInterval) clearInterval(robustnessInterval);
      if (observer) observer.disconnect();
    };
  }, []);

  const renderNode = (node, prefix = "", isLast = true, isRoot = false) => {
    if (!node) return null;

    let content = "";
    if (node.type === "text") {
      const textFn =
        node.content.length > 20
          ? node.content.substring(0, 20) + "..."
          : node.content;
      content = `"${textFn}"`;
    } else {
      content = `<${node.tagName}`;
      if (node.id) content += ` #${node.id}`;
      // if (node.className) content += ` .${node.className.split(" ")[0]}`;
      content += ">";
    }

    const connector = isRoot ? "" : isLast ? "└─ " : "├─ ";

    return (
      <div
        key={Math.random()}
        style={{
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: "1.5",
          whiteSpace: "pre",
        }}
      >
        <div style={{ display: "flex", color: "#333" }}>
          <span style={{ color: "#999" }}>
            {prefix}
            {connector}
          </span>
          <span
            style={{
              color: node.type === "text" ? "#666" : "#a90d9e",
              fontWeight: node.type === "element" ? "600" : "normal",
            }}
          >
            {content}
          </span>
        </div>
        {!collapsed &&
          node.children &&
          node.children.map((child, i) => {
            const isLastChild = i === node.children.length - 1;
            const childPrefixIsLast = isRoot ? "" : isLast ? "   " : "│  ";
            return renderNode(
              child,
              prefix + childPrefixIsLast,
              isLastChild,
              false
            );
          })}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 20, borderTop: "1px solid #eee", paddingTop: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <h4
          style={{ fontSize: "14px", fontWeight: 600, margin: 0, margin: 10 }}
        >
          DOM Outline
        </h4>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              const iframe = findPuckIframe();
              if (iframe) updateTree(iframe);
            }}
            className="_Button_10byl_1 _Button--primary_10byl_48 _Button--medium_10byl_29"
            type="button"
          >
            Refresh
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              setCollapsed(!collapsed);
            }}
            type="button"
            className="_Button_10byl_1 _Button--primary_10byl_48 _Button--medium_10byl_29"
            // style={{ marginLeft: "8px" }}
          >
            <div className="_Button-icon_10byl_44">
              {collapsed ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14px"
                  height="14px"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14px"
                  height="14px"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                </svg>
              )}
            </div>
            {/* {collapsed ? "Expand" : "Collapse"} */}
          </button>
        </div>
      </div>
      <div
        style={{
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
          overflowX: "auto",
          background: "#fff",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #eee",
        }}
      >
        {error && <div style={{ color: "red", fontSize: "11px" }}>{error}</div>}
        {tree ? renderNode(tree, "", true, true) : "Loading..."}
      </div>
    </div>
  );
};

const ComponentOutline = () => {
  const { appState, dispatch } = usePuck();
  const [collapsed, setCollapsed] = useState(false);
  const { data } = appState;

  if (!data || !data.content) return null;

  // Create a virtual root node to represent the Page itself
  const rootNode = {
    type: "Page",
    props: { id: "root", ...data.root.props },
    _isRoot: true,
  };

  const renderItem = (item, prefix = "", isLast = true, isRoot = false) => {
    const componentName = item.type || (item._isRoot ? "Page" : "Unknown");
    const id = item.props?.id || "root";
    const title = item.props?.title;

    // Find children
    let children = [];
    if (item._isRoot) {
      children = data.content || [];
    } else {
      // Check Zones
      if (data.zones) {
        const zonePrefix = `${id}:`;
        Object.keys(data.zones).forEach((key) => {
          if (key.startsWith(zonePrefix)) {
            children = [...children, ...data.zones[key]];
          }
        });
      }

      // Check Props for Slots (nested components stored in props)
      if (item.props) {
        Object.values(item.props).forEach((propValue) => {
          if (Array.isArray(propValue)) {
            const slots = propValue.filter(
              (child) =>
                child &&
                typeof child === "object" &&
                typeof child.type === "string"
            );
            children = [...children, ...slots];
          }
        });
      }
    }

    const hasChildren = children.length > 0;
    const connector = isRoot ? "" : isLast ? "└─ " : "├─ ";

    return (
      <div
        key={id}
        style={{
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: "1.5",
          whiteSpace: "pre",
        }}
      >
        <div
          style={{ display: "flex", color: "#333", cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            if (item._isRoot) {
              dispatch({
                type: "setUi",
                payload: {
                  itemSelector: { index: 0, zone: "root:default-zone" },
                },
              });
            }
          }}
        >
          <span style={{ color: "#999" }}>
            {prefix}
            {connector}
          </span>
          <span style={{ color: "#2ea043", fontWeight: "600" }}>
            {componentName}
          </span>
          {title && (
            <span style={{ color: "#666", marginLeft: "4px" }}>"{title}"</span>
          )}
        </div>
        {!collapsed &&
          hasChildren &&
          children.map((child, i) => {
            const isLastChild = i === children.length - 1;
            const childPrefixIsLast = isRoot ? "" : isLast ? "   " : "│  ";
            return renderItem(
              child,
              prefix + childPrefixIsLast,
              isLastChild,
              false
            );
          })}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 20, borderTop: "1px solid #eee", paddingTop: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <h4
          style={{ fontSize: "14px", fontWeight: 600, margin: 0, margin: 10 }}
        >
          Component Outline
        </h4>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              // No-op for now as data is reactive
            }}
            className="_Button_10byl_1 _Button--primary_10byl_48 _Button--medium_10byl_29"
            type="button"
          >
            Refresh
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              setCollapsed(!collapsed);
            }}
            type="button"
            className="_Button_10byl_1 _Button--primary_10byl_48 _Button--medium_10byl_29"
          >
            <div className="_Button-icon_10byl_44">
              {collapsed ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14px"
                  height="14px"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14px"
                  height="14px"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>
      <div
        style={{
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
          overflowX: "auto",
          background: "#fff",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #eee",
        }}
      >
        {renderItem(rootNode, "", true, true)}
      </div>
    </div>
  );
};

export const getScreenBreakpoints = () => {
  return [
    {
      width: 360,
      height: "auto",
      label: "s (360px - 22.5rem)",
      icon: "Smartphone",
    },
    { width: 640, height: "auto", label: "sm (640px - 40rem)", icon: "Tablet" },
    { width: 768, height: "auto", label: "md (768px - 48rem)", icon: "Tablet" },
    {
      width: 1024,
      height: "auto",
      label: "lg (1024px - 64rem)",
      icon: "Monitor",
    },
    {
      width: 1280,
      height: "auto",
      label: "xl (1280px - 80rem)",
      icon: "Monitor",
    },
    {
      width: 1536,
      height: "auto",
      label: "2xl (1536px - 96rem)",
      icon: "Monitor",
    },
  ];
};

const IndraSavePlugin = (options) => {
  return {
    overrides: {
      headerActions: ({ children }) => (
        <>
          {children}
          <SavePageButton path={options.savepages} />
        </>
      ),
      actionBar: ({ children, label }) => (
        <ActionBar label={label}>
          <ActionBar.Group>
            {children}
            <SaveBlock path={options.saveblocks} />
          </ActionBar.Group>
        </ActionBar>
      ),
      fields: ({ children, item, name }) => {
        // Only show for the root fields or if we want it strictly below specific fields.
        // But 'fields' wraps the entire field set for a selected component.
        return (
          <div>
            {children}
            {options.componentoutline && <ComponentOutline />}
            {options.domoutline && <DOMOutline />}
            {options.domstructure && <TreeView />}
          </div>
        );
      },
    },
  };
};

export default IndraSavePlugin;
