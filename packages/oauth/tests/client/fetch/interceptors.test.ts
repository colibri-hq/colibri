import { describe, expect, it, vi } from "vitest";
import {
  InterceptorManager,
  type RequestInterceptor,
  type ResponseInterceptor,
} from "../../../src/client/fetch/interceptors.js";

describe("InterceptorManager", () => {
  describe("request interceptors", () => {
    it("should run request interceptors in order", async () => {
      const manager = new InterceptorManager();
      const order: number[] = [];

      manager.addRequestInterceptor(async (req) => {
        order.push(1);
        return req;
      });

      manager.addRequestInterceptor(async (req) => {
        order.push(2);
        return req;
      });

      const request = new Request("https://example.com");
      await manager.runRequestInterceptors(request);

      expect(order).toEqual([1, 2]);
    });

    it("should allow interceptors to modify requests", async () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(async (req) => {
        const headers = new Headers(req.headers);
        headers.set("X-Custom-Header", "value");
        return new Request(req, { headers });
      });

      const request = new Request("https://example.com");
      const result = await manager.runRequestInterceptors(request);

      expect(result.headers.get("X-Custom-Header")).toBe("value");
    });

    it("should pass modified request to next interceptor", async () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(async (req) => {
        const headers = new Headers(req.headers);
        headers.set("X-First", "first");
        return new Request(req, { headers });
      });

      manager.addRequestInterceptor(async (req) => {
        const headers = new Headers(req.headers);
        headers.set("X-Second", "second");
        return new Request(req, { headers });
      });

      const request = new Request("https://example.com");
      const result = await manager.runRequestInterceptors(request);

      expect(result.headers.get("X-First")).toBe("first");
      expect(result.headers.get("X-Second")).toBe("second");
    });

    it("should allow removing interceptors", async () => {
      const manager = new InterceptorManager();
      const interceptor = vi.fn<RequestInterceptor>((req) => Promise.resolve(req));

      const remove = manager.addRequestInterceptor(interceptor);

      const request = new Request("https://example.com");
      await manager.runRequestInterceptors(request);
      expect(interceptor).toHaveBeenCalledTimes(1);

      remove();

      await manager.runRequestInterceptors(request);
      expect(interceptor).toHaveBeenCalledTimes(1); // Not called again
    });

    it("should handle async interceptors", async () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(async (req) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const headers = new Headers(req.headers);
        headers.set("X-Async", "true");
        return new Request(req, { headers });
      });

      const request = new Request("https://example.com");
      const result = await manager.runRequestInterceptors(request);

      expect(result.headers.get("X-Async")).toBe("true");
    });

    it("should propagate errors from interceptors", async () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(async () => {
        throw new Error("Interceptor error");
      });

      const request = new Request("https://example.com");
      await expect(manager.runRequestInterceptors(request)).rejects.toThrow("Interceptor error");
    });
  });

  describe("response interceptors", () => {
    it("should run response interceptors in order", async () => {
      const manager = new InterceptorManager();
      const order: number[] = [];

      manager.addResponseInterceptor(async (res) => {
        order.push(1);
        return res;
      });

      manager.addResponseInterceptor(async (res) => {
        order.push(2);
        return res;
      });

      const response = new Response("test");
      const request = new Request("https://example.com");
      await manager.runResponseInterceptors(response, request);

      expect(order).toEqual([1, 2]);
    });

    it("should allow interceptors to modify responses", async () => {
      const manager = new InterceptorManager();

      manager.addResponseInterceptor(async (res) => {
        const headers = new Headers(res.headers);
        headers.set("X-Modified", "true");
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      });

      const response = new Response("test");
      const request = new Request("https://example.com");
      const result = await manager.runResponseInterceptors(response, request);

      expect(result.headers.get("X-Modified")).toBe("true");
    });

    it("should receive the request in interceptor", async () => {
      const manager = new InterceptorManager();
      let capturedRequest: Request | undefined;

      manager.addResponseInterceptor(async (res, req) => {
        capturedRequest = req;
        return res;
      });

      const response = new Response("test");
      const request = new Request("https://example.com/test");
      await manager.runResponseInterceptors(response, request);

      expect(capturedRequest?.url).toBe("https://example.com/test");
    });

    it("should allow removing interceptors", async () => {
      const manager = new InterceptorManager();
      const interceptor = vi.fn<ResponseInterceptor>((res) => Promise.resolve(res));

      const remove = manager.addResponseInterceptor(interceptor);

      const response = new Response("test");
      const request = new Request("https://example.com");

      await manager.runResponseInterceptors(response, request);
      expect(interceptor).toHaveBeenCalledTimes(1);

      remove();

      await manager.runResponseInterceptors(response, request);
      expect(interceptor).toHaveBeenCalledTimes(1); // Not called again
    });

    it("should propagate errors from interceptors", async () => {
      const manager = new InterceptorManager();

      manager.addResponseInterceptor(async () => {
        throw new Error("Response interceptor error");
      });

      const response = new Response("test");
      const request = new Request("https://example.com");

      await expect(manager.runResponseInterceptors(response, request)).rejects.toThrow(
        "Response interceptor error",
      );
    });
  });

  describe("mixed interceptors", () => {
    it("should handle both request and response interceptors", async () => {
      const manager = new InterceptorManager();
      const calls: string[] = [];

      manager.addRequestInterceptor(async (req) => {
        calls.push("request");
        return req;
      });

      manager.addResponseInterceptor(async (res) => {
        calls.push("response");
        return res;
      });

      const request = new Request("https://example.com");
      await manager.runRequestInterceptors(request);

      const response = new Response("test");
      await manager.runResponseInterceptors(response, request);

      expect(calls).toEqual(["request", "response"]);
    });
  });
});
