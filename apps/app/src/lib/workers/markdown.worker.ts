import { marked } from 'marked';

onmessage = function handleMessage({ data }) {
  postMessage(marked.parse(data));
};
