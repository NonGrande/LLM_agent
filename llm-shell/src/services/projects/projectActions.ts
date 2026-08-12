import { useChatStore } from "@/stores/chatStore";
import { useFileStore } from "@/stores/fileStore";
import { useGitStore } from "@/stores/gitStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWorkspaceUiStore } from "@/stores/workspaceUiStore";
import { upsertProject } from "@/services/projects/projectHelpers";
import { scheduleReindex, useIndexStore } from "@/stores/indexStore";

/** Open or create a project folder and switch workspace + chats. */
export async function openProjectFolder(path: string): Promise<void> {
  const settings = useSettingsStore.getState().settings;
  const { projects, project } = upsertProject(settings.projects ?? [], path);
  useSettingsStore.setState({
    settings: {
      ...settings,
      projects,
      activeProjectId: project.id,
      workspace: { ...settings.workspace, path },
      agent: { ...settings.agent, workingDirectory: path },
    },
  });
  useWorkspaceUiStore.getState().closeAll();
  await useFileStore.getState().setRootPath(path);
  await useGitStore.getState().refresh(path);
  useChatStore.getState().ensureSessionForProject(project.id);
  if (project.activeProfileId) {
    useSettingsStore.getState().setActiveProfile(project.activeProfileId);
  }
  scheduleReindex(project.id, path);
  void useIndexStore.getState().refreshMeta(project.id);
}

/** Switch active project (must exist in list). */
export async function activateProject(projectId: string): Promise<void> {
  const settings = useSettingsStore.getState().settings;
  const project = settings.projects?.find((p) => p.id === projectId);
  if (!project) return;

  useSettingsStore.setState({
    settings: {
      ...settings,
      activeProjectId: project.id,
      workspace: { ...settings.workspace, path: project.path },
      agent: { ...settings.agent, workingDirectory: project.path },
    },
  });
  useWorkspaceUiStore.getState().closeAll();
  await useFileStore.getState().setRootPath(project.path);
  await useGitStore.getState().refresh(project.path || null);
  useChatStore.getState().ensureSessionForProject(project.id);
  if (project.activeProfileId) {
    useSettingsStore.getState().setActiveProfile(project.activeProfileId);
  }
  if (project.path) {
    scheduleReindex(project.id, project.path);
    void useIndexStore.getState().refreshMeta(project.id);
  }
}

/** Remove project from list (not files on disk). */
export async function removeProjectFromList(projectId: string): Promise<void> {
  const settings = useSettingsStore.getState().settings;
  const projects = (settings.projects ?? []).filter((p) => p.id !== projectId);
  if (projects.length === 0) return;

  const switching = settings.activeProjectId === projectId;
  const nextActive = switching ? projects[0].id : settings.activeProjectId;

  useSettingsStore.setState({
    settings: { ...settings, projects, activeProjectId: nextActive },
  });

  if (switching) await activateProject(nextActive);
}

/** Close current workspace (legacy clear). */
export async function clearActiveProjectWorkspace(): Promise<void> {
  const settings = useSettingsStore.getState().settings;
  useSettingsStore.setState({
    settings: {
      ...settings,
      workspace: { ...settings.workspace, path: "" },
      agent: { ...settings.agent, workingDirectory: "" },
    },
  });
  useWorkspaceUiStore.getState().closeAll();
  await useFileStore.getState().setRootPath("");
  await useGitStore.getState().refresh(null);
}
