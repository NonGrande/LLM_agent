import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage, ChatSession } from "@/types";
import { STORAGE_KEYS } from "@/utils/constants";
import { createAppDataJSONStorage } from "@/services/persist/appDataStorage";
import {
  DEFAULT_PROJECT_ID,
  sessionProjectId,
} from "@/services/projects/projectHelpers";

function uid(): string {
  return crypto.randomUUID();
}

function createSession(projectId: string): ChatSession {
  const now = Date.now();
  return {
    id: uid(),
    projectId,
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function migrateSessions(sessions: ChatSession[]): ChatSession[] {
  return sessions.map((s) => ({
    ...s,
    projectId: s.projectId ?? DEFAULT_PROJECT_ID,
  }));
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string;
  isStreaming: boolean;
  draft: string;

  sessionsForProject: (projectId: string) => ChatSession[];
  currentSession: () => ChatSession;
  setDraft: (text: string) => void;
  newSession: (projectId?: string) => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  clearSessionMessages: (id: string) => void;
  clearAllSessions: (projectId?: string) => void;
  ensureSessionForProject: (projectId: string) => void;
  addMessage: (msg: Omit<ChatMessage, "id" | "createdAt"> & { id?: string }) => string;
  updateMessage: (id: string, partial: Partial<ChatMessage>) => void;
  appendToMessage: (id: string, chunk: string) => void;
  clearMessages: () => void;
  setStreaming: (v: boolean) => void;
}

type ChatPersisted = Pick<ChatState, "sessions" | "currentSessionId">;

export const useChatStore = create<ChatState>()(
  persist<ChatState, [], [], ChatPersisted>(
    (set, get) => {
      const initial = createSession(DEFAULT_PROJECT_ID);
      return {
        sessions: [initial],
        currentSessionId: initial.id,
        isStreaming: false,
        draft: "",

        sessionsForProject: (projectId) =>
          get().sessions.filter((s) => sessionProjectId(s) === projectId),

        currentSession: () => {
          const { sessions, currentSessionId } = get();
          return sessions.find((s) => s.id === currentSessionId) ?? sessions[0];
        },

        setDraft: (text) => set({ draft: text }),

        newSession: (projectId) => {
          const pid = projectId ?? DEFAULT_PROJECT_ID;
          const session = createSession(pid);
          set((s) => ({
            sessions: [session, ...s.sessions].slice(0, 100),
            currentSessionId: session.id,
            draft: "",
          }));
        },

        ensureSessionForProject: (projectId) => {
          const { sessions, currentSessionId } = get();
          const current = sessions.find((s) => s.id === currentSessionId);
          if (current && sessionProjectId(current) === projectId) return;
          const projectSessions = sessions.filter((s) => sessionProjectId(s) === projectId);
          if (projectSessions.length > 0) {
            set({ currentSessionId: projectSessions[0].id, draft: "" });
          } else {
            get().newSession(projectId);
          }
        },

        selectSession: (id) => set({ currentSessionId: id, draft: "" }),

        deleteSession: (id) => {
          const { sessions, currentSessionId } = get();
          const deleted = sessions.find((s) => s.id === id);
          const pid = deleted ? sessionProjectId(deleted) : DEFAULT_PROJECT_ID;
          const remaining = sessions.filter((s) => s.id !== id);
          const projectRemaining = remaining.filter((s) => sessionProjectId(s) === pid);
          if (projectRemaining.length === 0) {
            const session = createSession(pid);
            set({
              sessions: [session, ...remaining].slice(0, 100),
              currentSessionId: session.id,
              draft: currentSessionId === id ? "" : get().draft,
            });
            return;
          }
          const nextId =
            currentSessionId === id ? projectRemaining[0].id : currentSessionId;
          set({
            sessions: remaining,
            currentSessionId: nextId,
            draft: currentSessionId === id ? "" : get().draft,
          });
        },

        clearSessionMessages: (id) =>
          set((s) => ({
            sessions: s.sessions.map((session) =>
              session.id === id
                ? { ...session, messages: [], updatedAt: Date.now(), title: "New chat" }
                : session,
            ),
            draft: s.currentSessionId === id ? "" : s.draft,
          })),

        clearAllSessions: (projectId) => {
          const pid = projectId ?? DEFAULT_PROJECT_ID;
          const session = createSession(pid);
          set((s) => ({
            sessions: [
              session,
              ...s.sessions.filter((x) => sessionProjectId(x) !== pid),
            ].slice(0, 100),
            currentSessionId: session.id,
            draft: "",
          }));
        },

        addMessage: (msg) => {
          const id = msg.id ?? uid();
          const full: ChatMessage = {
            ...msg,
            id,
            createdAt: Date.now(),
          };
          set((s) => ({
            sessions: s.sessions.map((session) =>
              session.id === s.currentSessionId
                ? {
                    ...session,
                    messages: [...session.messages, full],
                    updatedAt: Date.now(),
                    title:
                      session.messages.filter((m) => m.role !== "system").length === 0 &&
                      full.role === "user"
                        ? String(typeof full.content === "string" ? full.content : "New chat").slice(
                            0,
                            48,
                          )
                        : session.title,
                  }
                : session,
            ),
          }));
          return id;
        },

        updateMessage: (id, partial) =>
          set((s) => ({
            sessions: s.sessions.map((session) =>
              session.id === s.currentSessionId
                ? {
                    ...session,
                    messages: session.messages.map((m) => (m.id === id ? { ...m, ...partial } : m)),
                    updatedAt: Date.now(),
                  }
                : session,
            ),
          })),

        appendToMessage: (id, chunk) =>
          set((s) => ({
            sessions: s.sessions.map((session) =>
              session.id === s.currentSessionId
                ? {
                    ...session,
                    messages: session.messages.map((m) =>
                      m.id === id && typeof m.content === "string"
                        ? { ...m, content: m.content + chunk }
                        : m,
                    ),
                    updatedAt: Date.now(),
                  }
                : session,
            ),
          })),

        clearMessages: () =>
          set((s) => ({
            sessions: s.sessions.map((session) =>
              session.id === s.currentSessionId
                ? { ...session, messages: [], updatedAt: Date.now(), title: "New chat" }
                : session,
            ),
          })),

        setStreaming: (v) => set({ isStreaming: v }),
      };
    },
    {
      name: STORAGE_KEYS.CURRENT_SESSION,
      storage: createAppDataJSONStorage<ChatPersisted>(),
      partialize: (s): ChatPersisted => ({
        sessions: migrateSessions(s.sessions).map((session) => ({
          ...session,
          messages: session.messages.map((m) => ({ ...m, streaming: false })),
        })),
        currentSessionId: s.currentSessionId,
      }),
      merge: (persisted, current) => {
        const p = persisted as ChatPersisted | undefined;
        if (!p?.sessions) return current;
        return {
          ...current,
          sessions: migrateSessions(p.sessions),
          currentSessionId: p.currentSessionId ?? current.currentSessionId,
        };
      },
    },
  ),
);
