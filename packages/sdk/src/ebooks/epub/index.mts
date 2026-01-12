/// <reference lib="dom" />
import { XMLParser } from "fast-xml-parser";

// DOM-like wrapper for fast-xml-parser
 
class _XMLNode {
  _node: any;
  _namespaces: Record<string, string>;
  nodeType: number;
  ELEMENT_NODE = 1;
  TEXT_NODE = 3;

  constructor(node: any, namespaces: Record<string, string> = {}) {
    this._node = node;
    this._namespaces = namespaces;
    this.nodeType =
      typeof node === "object" ? this.ELEMENT_NODE : this.TEXT_NODE;
  }

  get nodeName() {
    if (typeof this._node !== "object") return "#text";
    const key = Object.keys(this._node)[0];
    if (key && key.includes(":")) return key;
    return this._node["#name"] || "";
  }

  get namespaceURI() {
    if (typeof this._node !== "object") return null;
    const prefix = this.prefix;
    return prefix ? this._namespaces[prefix] || null : null;
  }

  get prefix() {
    if (typeof this._node !== "object") return null;
    const name = this._node["#name"] || "";
    const parts = name.split(":");
    return parts.length > 1 ? parts[0] : null;
  }

  get localName() {
    if (typeof this._node !== "object") return null;
    const name = this._node["#name"] || "";
    const parts = name.split(":");
    return parts.length > 1 ? parts[1] : name;
  }

  get textContent() {
    if (typeof this._node !== "object") return this._node?.toString() || "";
    return this._node["#text"] || "";
  }

  get firstElementChild() {
    if (typeof this._node !== "object") return null;
    const childElements = this.childNodes.filter(
      (node) => node.nodeType === node.ELEMENT_NODE,
    );
    return childElements.length > 0 ? childElements[0] : null;
  }

  get firstChild() {
    if (typeof this._node !== "object") return null;
    return this.childNodes[0] || null;
  }

  get nextSibling() {
    return null; // Would need parent reference to implement
  }

  get childNodes() {
    if (typeof this._node !== "object") return [];

    const result: _XMLNode[] = [];
    // If it's a structured node object
    if (Array.isArray(this._node)) {
      for (const item of this._node) {
        if (typeof item === "object") {
          result.push(new _XMLNode(item, this._namespaces));
        } else if (item !== undefined) {
          result.push(new _XMLNode(item, this._namespaces));
        }
      }
      return result;
    }

    // Regular object with properties
    for (const key in this._node) {
      if (
        key === "#text" ||
        key === "@_xmlns" ||
        key === "@_xml:lang" ||
        key.startsWith("@_")
      )
        continue;
      if (key === "#name") continue;

      const value = this._node[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          result.push(new _XMLNode({ [key]: item }, this._namespaces));
        }
      } else if (value !== undefined) {
        result.push(new _XMLNode({ [key]: value }, this._namespaces));
      }
    }

    // Add text node if it exists
    if (this._node["#text"] !== undefined) {
      result.push(new _XMLNode(this._node["#text"], this._namespaces));
    }

    return result;
  }

  getElementsByTagName(name: string) {
    const results: _XMLNode[] = [];
    this._getElementsByTagName(name, results);
    return results;
  }

  _getElementsByTagName(name: string, results: _XMLNode[]) {
    for (const child of this.childNodes) {
      if (child.nodeType === child.ELEMENT_NODE) {
        if (child.localName === name) {
          results.push(child);
        }
        child._getElementsByTagName(name, results);
      }
    }
  }

  getElementsByTagNameNS(namespace: string, name: string) {
    const results: _XMLNode[] = [];
    this._getElementsByTagNameNS(namespace, name, results);
    return results;
  }

  _getElementsByTagNameNS(namespace: string, name: string, results: _XMLNode[]) {
    for (const child of this.childNodes) {
      if (child.nodeType === child.ELEMENT_NODE) {
        if (child.localName === name && child.namespaceURI === namespace) {
          results.push(child);
        }
        child._getElementsByTagNameNS(namespace, name, results);
      }
    }
  }

  getElementById(id: string) {
    return this._getElementById(id);
  }

  _getElementById(id: string): _XMLNode | null {
    if (typeof this._node !== "object") return null;

    if (this.getAttribute("id") === id) return this;

    for (const child of this.childNodes) {
      if (child.nodeType === child.ELEMENT_NODE) {
        const result = child._getElementById(id);
        if (result) return result;
      }
    }

    return null;
  }

  getAttribute(name: string) {
    if (typeof this._node !== "object") return null;
    return this._node[`@_${name}`] || null;
  }

  getAttributeNS(namespace: string, name: string) {
    // Simplified implementation - would need namespace mapping
    return this.getAttribute(name);
  }

  hasAttribute(name: string) {
    return this.getAttribute(name) !== null;
  }

  querySelector(selector: string) {
    // Basic implementation for common selectors like '#id' and '[attr="value"]'
    if (selector.startsWith("#")) {
      return this.getElementById(selector.substring(1));
    } else if (selector.match(/^\[name="([^"]+)"\]$/)) {
      const name = selector.match(/^\[name="([^"]+)"\]$/)?.[1];
      return this._getElementByAttribute("name", name || "");
    }
    return null;
  }

  querySelectorAll(selector: string) {
    // Basic implementation for common selectors
    const results: _XMLNode[] = [];

    if (selector.includes("[") && selector.includes("]")) {
      const attrMatch = selector.match(
        /\[([^\]=]+)(?:=(?:["']([^"']+)["'])?)?\]/,
      );
      if (attrMatch) {
        const [, attr, value] = attrMatch;
        this._getElementsByAttribute(attr, value, results);
      }
    } else {
      // Treat as tag name
      this._getElementsByTagName(selector, results);
    }

    return results;
  }

  _getElementByAttribute(attr: string, value: string): _XMLNode | null {
    if (typeof this._node !== "object") return null;

    if (this.getAttribute(attr) === value) return this;

    for (const child of this.childNodes) {
      if (child.nodeType === child.ELEMENT_NODE) {
        const result = child._getElementByAttribute(attr, value);
        if (result) return result;
      }
    }

    return null;
  }

  _getElementsByAttribute(
    attr: string,
    value: string | undefined,
    results: _XMLNode[],
  ) {
    if (typeof this._node !== "object") return;

    if (value === undefined) {
      if (this.hasAttribute(attr)) {
        results.push(this);
      }
    } else if (this.getAttribute(attr) === value) {
      results.push(this);
    }

    for (const child of this.childNodes) {
      if (child.nodeType === child.ELEMENT_NODE) {
        child._getElementsByAttribute(attr, value, results);
      }
    }
  }
}

 
class _DOMWrapper {
  _parser: XMLParser;

  constructor() {
    this._parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
       
      isArray: (name, _jpath, _isLeafNode, _isAttribute) => {
        // Known elements that should always be arrays
        const arrayElements = [
          "item",
          "itemref",
          "reference",
          "navPoint",
          "navLabel",
          "meta",
          "navTarget",
          "par",
          "spine",
          "manifest",
          "metadata",
          "dc:creator",
          "dc:contributor",
        ];
        return arrayElements.includes(name);
      },
      preserveOrder: true,
      parseAttributeValue: true,
      allowBooleanAttributes: true,
      namespaceDeclarations: true,
    });
  }

   
  parseFromString(xmlText: string, _mimeType: string) {
    try {
      const parsed = this._parser.parse(xmlText);
      // Create namespace map
      const namespaces: Record<string, string> = {};
      this._extractNamespaces(parsed, namespaces);

      return new XMLDocument(parsed, namespaces);
    } catch (err) {
      console.error("XML parsing error:", err);
      const errorDoc = new XMLDocument(
        [{ error: { message: String(err) } }],
        {},
      );
      return errorDoc;
    }
  }

  _extractNamespaces(node: any, namespaces: Record<string, string>) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (const item of node) {
        this._extractNamespaces(item, namespaces);
      }
      return;
    }

    // Extract namespace declarations
    for (const key in node) {
      if (key.startsWith("@_xmlns:")) {
        const prefix = key.substring(8);
        namespaces[prefix] = node[key];
      } else if (key === "@_xmlns") {
        namespaces[""] = node[key];
      }

      // Recursively extract from children
      this._extractNamespaces(node[key], namespaces);
    }
  }
}
