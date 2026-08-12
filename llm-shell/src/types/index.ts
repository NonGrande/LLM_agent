export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" };
}

export type ContentPart = TextContent | ImageContent;

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string | ContentPart[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  createdAt: number;
  streaming?: boolean;
  /** User feedback on assistant answers (K7) */
  feedback?: "up" | "down";
  /** Pin into success memory (K8) */
  pinned?: boolean;
  /** Appended to workspace AGENTS.md as project rule */
  agentsPinned?: boolean;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface GenerationParams {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  tool_choice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  stream?: boolean;
}

export {
  PROVIDER_PRESETS,
  PROVIDER_TYPE_ORDER,
  PROVIDER_CATEGORY_META,
  PROVIDER_CATEGORY_ORDER,
  getProviderPreset,
  providersInCategory,
  profileLabelMismatch,
  profileModelFamilyMismatch,
  looksLikeOllamaModelId,
  looksLikeDeepseekCloudModelId,
  healProfileModelsIfMismatched,
  presetModelFields,
  isKeylessProbeType,
  YANDEX_MODEL_URI_HINT,
  yandexModelUriError,
  enrichYandexModelUriHttpError,
} from "@/services/llm/providerPresets";
export type {
  ProviderType,
  ProviderPreset,
  ProviderCategory,
} from "@/services/llm/providerPresets";

import type { ProviderType } from "@/services/llm/providerPresets";
import { PROVIDER_PRESETS as PRESETS } from "@/services/llm/providerPresets";

/** Per-model limits / pricing (fill RPM/TPM/RPD from your provider console). */
export interface ModelQuota {
  id: string;
  contextWindow?: number;
  /** Requests per minute */
  rpm?: number;
  /** Tokens per minute */
  tpm?: number;
  /** Requests per day */
  rpd?: number;
  priceInPer1M?: number;
  priceOutPer1M?: number;
  notes?: string;
}

/**
 * Saved API connection (Ollama, xAI/Grok, OpenAI, Custom, …).
 * Switch profiles in Settings without retyping keys.
 */
export interface ApiProfile {
  id: string;
  label: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  availableModels: string[];
  modelQuotas: ModelQuota[];
  fallbackModels: string[];
  failoverEnabled: boolean;
}

export interface ProviderConfig {
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  /** Primary model */
  model: string;
  availableModels: string[];
  /** Quotas for models on this connection (editable) */
  modelQuotas: ModelQuota[];
  /**
   * Ordered fallback chain after `model`.
   * On rate-limit / overload / context / model-missing errors the agent switches to the next.
   */
  fallbackModels: string[];
  /** Auto-switch to next model when limit/error matches (default true) */
  failoverEnabled: boolean;
}

export interface GenerationConfig {
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface AgentConfirmations {
  writeFile: boolean;
  editFile: boolean;
  executeCommand: boolean;
  deleteFile: boolean;
}

export interface AgentConfig {
  maxIterations: number;
  autoExecute: boolean;
  confirmations: AgentConfirmations;
  maxContextTokens: number;
  workingDirectory: string;
  /** default | reviewer | refactor — injects role into system prompt */
  role: AgentRole;
  /**
   * Offline mode: force Ollama (7B) profile only.
   * Online agent should use OpenRouter / xAI, not local 7B.
   */
  offlineMode: boolean;
  /** Learn from successful tasks and inject similar past solutions (RAG) */
  ragFromSuccess: boolean;
  /** Force tool_choice: required in Agent mode (helps weak local models) */
  strictTools: boolean;
  /** Ask = read-only tools; Agent = full tools; Plan = no tools */
  mode: AgentMode;
}

export type AgentRole = "default" | "reviewer" | "refactor";
export type AgentMode = "ask" | "agent" | "plan";

export type McpTransport = "http" | "sse" | "stdio";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: McpTransport;
  /** HTTP/SSE endpoint URL (ignored for stdio until native pipe lands) */
  url: string;
  enabled: boolean;
  /** Optional Authorization bearer (without "Bearer ") */
  apiKey?: string;
  /** stdio: command to spawn (e.g. npx) */
  command?: string;
  /** stdio: args */
  args?: string[];
}

/** Cross-profile failover after model chain exhausted / network dead */
export interface ProfileFailoverConfig {
  enabled: boolean;
  /** Ordered profile ids to try after the active one */
  fallbackProfileIds: string[];
}

export interface NetworkConfig {
  proxyEnabled: boolean;
  /** e.g. socks5://127.0.0.1:1080 or http://user:pass@host:8080 */
  proxyUrl: string;
  /** Prefer Rust HTTP path in Tauri even without proxy (avoids CORS) */
  forceRustHttp: boolean;
}

export interface AppSettings {
  provider: ProviderConfig;
  /** Saved API connections; active one mirrors `provider` */
  apiProfiles: ApiProfile[];
  activeProfileId: string;
  profileFailover: ProfileFailoverConfig;
  generation: GenerationConfig;
  agent: AgentConfig;
  workspace: WorkspaceConfig;
  projects: Project[];
  activeProjectId: string;
  appearance: AppearanceConfig;
  editor: EditorConfig;
  network: NetworkConfig;
  /** MCP servers (HTTP/SSE JSON-RPC) */
  mcpServers: McpServerConfig[];
  /** First-run wizard completed */
  onboardingCompleted?: boolean;
}

export interface WorkspaceConfig {
  path: string;
  excludedPatterns: string[];
}

/** Saved workspace / «площадка» with isolated chat history */
export interface Project {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: number;
  /** Optional API profile override for this project */
  activeProfileId?: string;
}

export type ThemeMode = "dark" | "light" | "system";
export type Density = "compact" | "comfortable";

export interface AppearanceConfig {
  theme: ThemeMode;
  fontSize: number;
  density: Density;
}

/** Editor IDE features (ghost-text / LSP) */
export interface EditorConfig {
  /** LLM inline ghost completions in Monaco */
  ghostTextEnabled: boolean;
  /** Spawn language server over process pipe (multi-lang registry) */
  lspEnabled: boolean;
  /** Legacy: override for TypeScript/JavaScript server */
  lspCommand: string;
  lspArgs: string[];
  /** Optional per-language overrides: { python: { command, args } } */
  lspServers?: Record<string, { command: string; args: string[] }>;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  is_binary: boolean;
  encoding: string;
}

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number;
}

export interface GrepMatch {
  file_path: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exit_code: number | null;
  duration_ms: number;
}

export interface EditResult {
  success: boolean;
  matches_found: number;
  message: string;
}

export interface FileInfo {
  path: string;
  size: number;
  is_dir: boolean;
  is_readonly: boolean;
  modified: number;
  created: number;
}

export interface SystemInfo {
  os: string;
  arch: string;
  hostname: string;
  cpu_count: number;
  memory_total: number;
  shell: string;
}

export type AgentStatus = "idle" | "thinking" | "executing_tool" | "waiting_confirmation" | "error" | "stopped";

export interface ToolExecution {
  id: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: "pending" | "running" | "success" | "error" | "cancelled";
  startedAt: number;
  completedAt?: number;
}

export interface ChatSession {
  id: string;
  /** Project / площадка this chat belongs to */
  projectId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type PermissionAction = "writeFile" | "editFile" | "executeCommand" | "deleteFile";

export interface PermissionRequest {
  id: string;
  action: PermissionAction;
  description: string;
  details: Record<string, unknown>;
  resolve: (granted: boolean) => void;
}

function makeOfflineOllamaProvider(): ProviderConfig {
  const models = [...PRESETS.ollama.models];
  return {
    name: "Ollama (offline / 7B)",
    type: "ollama",
    baseUrl: PRESETS.ollama.baseUrl,
    apiKey: "",
    model: "qwen2.5-coder:7b",
    availableModels: models,
    modelQuotas: models.map((id) => ({ id })),
    fallbackModels: ["qwen2.5-coder:14b", "qwen2.5:7b"],
    failoverEnabled: true,
  };
}

function makeOpenRouterCombatProvider(): ProviderConfig {
  const models = [...PRESETS.openrouter.models];
  return {
    name: "OpenRouter (боевой)",
    type: "openrouter",
    baseUrl: PRESETS.openrouter.baseUrl,
    apiKey: "",
    model: "anthropic/claude-sonnet-4",
    availableModels: models,
    modelQuotas: models.map((id) => ({ id })),
    fallbackModels: ["openai/gpt-4o", "x-ai/grok-4", "deepseek/deepseek-chat"],
    failoverEnabled: true,
  };
}

function makeXaiCombatProvider(): ProviderConfig {
  const models = [...PRESETS.xai.models];
  return {
    name: "xAI Grok (боевой)",
    type: "xai",
    baseUrl: PRESETS.xai.baseUrl,
    apiKey: "",
    model: "grok-4.5",
    availableModels: models,
    modelQuotas: models.map((id) => ({ id })),
    fallbackModels: ["grok-4", "grok-3-mini"],
    failoverEnabled: true,
  };
}

export function providerToProfile(provider: ProviderConfig, id?: string, label?: string): ApiProfile {
  const newId =
    id ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `profile-${Date.now()}`);
  return {
    id: newId,
    label: label ?? provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: provider.model,
    availableModels: provider.availableModels ?? [],
    modelQuotas: provider.modelQuotas ?? (provider.availableModels ?? []).map((mid) => ({ id: mid })),
    fallbackModels: provider.fallbackModels ?? [],
    failoverEnabled: provider.failoverEnabled !== false,
  };
}

export function profileToProvider(profile: ApiProfile): ProviderConfig {
  return {
    name: profile.label,
    type: profile.type,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: profile.model,
    availableModels: profile.availableModels,
    modelQuotas: profile.modelQuotas,
    fallbackModels: profile.fallbackModels,
    failoverEnabled: profile.failoverEnabled,
  };
}

const openRouterProfile = providerToProfile(
  makeOpenRouterCombatProvider(),
  "profile-openrouter",
  "OpenRouter (боевой)",
);
const xaiProfile = providerToProfile(makeXaiCombatProvider(), "profile-xai", "xAI Grok (боевой)");
const ollamaProfile = providerToProfile(
  makeOfflineOllamaProvider(),
  "profile-ollama",
  "Ollama (offline / 7B)",
);

export const DEFAULT_SETTINGS: AppSettings = {
  provider: profileToProvider(openRouterProfile),
  apiProfiles: [openRouterProfile, xaiProfile, ollamaProfile],
  activeProfileId: openRouterProfile.id,
  profileFailover: {
    enabled: true,
    fallbackProfileIds: [xaiProfile.id, ollamaProfile.id],
  },
  generation: {
    temperature: 0.2,
    maxTokens: 4096,
    topP: 1.0,
  },
  agent: {
    maxIterations: 25,
    autoExecute: false,
    confirmations: {
      writeFile: true,
      editFile: true,
      executeCommand: true,
      deleteFile: true,
    },
    maxContextTokens: 128000,
    workingDirectory: "",
    role: "default",
    offlineMode: false,
    ragFromSuccess: true,
    strictTools: false,
    mode: "agent",
  },
  workspace: {
    path: "",
    excludedPatterns: ["node_modules", ".git", "dist", "build", "target", "__pycache__", ".next"],
  },
  projects: [],
  activeProjectId: "",
  appearance: {
    theme: "dark",
    fontSize: 14,
    density: "comfortable",
  },
  editor: {
    ghostTextEnabled: false,
    lspEnabled: false,
    lspCommand: "typescript-language-server",
    lspArgs: ["--stdio"],
  },
  network: {
    proxyEnabled: false,
    proxyUrl: "socks5://127.0.0.1:1080",
    forceRustHttp: true,
  },
  mcpServers: [],
  onboardingCompleted: false,
};
