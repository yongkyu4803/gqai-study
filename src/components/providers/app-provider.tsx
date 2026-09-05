"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { nanoid } from "nanoid";
import { validateAnnouncement, type AnnouncementInput } from "@/lib/domain/announcements";
import { reorderAssignments as reorderAssignmentsState } from "@/lib/domain/assignment-order";
import { createDemoSeed, demoCredentials } from "@/lib/demo/seed";
import {
  archiveModule as archiveModuleState,
  createAssignmentBatch,
  createDraftModule,
  createFeedback as createFeedbackState,
  duplicateModule as duplicateModuleState,
  manageAssignment as manageAssignmentState,
  markAssignmentOpened,
  markFeedbackRead as markFeedbackReadState,
  newBlankSnapshot,
  publishModule as publishModuleState,
  saveModuleDraft,
  saveSubmissionDraft,
  submitDraft,
  updateLearning as updateLearningState,
} from "@/lib/domain/operations";
import type {
  AppState,
  AssignmentInput,
  AssignmentManagementAction,
  CreateGroupInput,
  CreateStudentInput,
  FeedbackInput,
  FileAsset,
  ModuleSnapshot,
  SessionUser,
  SubmissionDraftInput,
} from "@/lib/domain/types";
import {
  emailSchema,
  groupSchema,
  loginIdSchema,
  passwordSchema,
  studentSchema,
  toAuthEmail,
  validateFile,
  validateModuleSnapshot,
  validateSubmissionItems,
} from "@/lib/domain/validation";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  getEmptyState,
  SIGNED_ASSET_URL_REFRESH_INTERVAL_MS,
  SupabaseRepository,
} from "@/lib/supabase/repository";

// Bump when the bundled demo curriculum changes so stale browser fixtures do
// not hide newly shipped lessons.
const STATE_KEY = "gqai-study-demo-state-v3";
const SESSION_KEY = "gqai-study-demo-session-v2";
const CREDENTIAL_KEY = "gqai-study-demo-credentials-v2";

type UploadScope =
  | { kind: "module"; moduleId: string }
  | { kind: "submission"; assignmentId: string; submissionId?: string }
  | { kind: "feedback"; assignmentId: string; messageId?: string };

interface AppContextValue {
  saveAnnouncement: (input: AnnouncementInput) => Promise<void>;
  reorderAssignments: (
    kind: "student" | "group",
    targetId: string,
    ids: string[],
  ) => Promise<void>;
  state: AppState;
  session: SessionUser | null;
  ready: boolean;
  mode: "demo" | "supabase";
  refresh: () => Promise<void>;
  login: (loginId: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  resetDemo: () => void;
  createStudent: (input: CreateStudentInput) => Promise<string>;
  resetStudentPassword: (studentId: string, password: string) => Promise<void>;
  toggleStudentActive: (studentId: string) => Promise<void>;
  updateStudentEmail: (studentId: string, email: string) => Promise<void>;
  updateMyEmail: (email: string) => Promise<void>;
  createGroup: (input: CreateGroupInput) => Promise<string>;
  updateGroup: (groupId: string, input: CreateGroupInput) => Promise<void>;
  archiveGroup: (groupId: string) => Promise<void>;
  createModule: () => Promise<string>;
  saveModule: (moduleId: string, snapshot: ModuleSnapshot) => Promise<void>;
  publishModule: (moduleId: string) => Promise<string>;
  duplicateModule: (moduleId: string) => Promise<string>;
  archiveModule: (moduleId: string) => Promise<void>;
  assign: (input: AssignmentInput) => Promise<string>;
  assignMany: (
    inputs: AssignmentInput[],
  ) => Promise<{ createdCount: number; failedCount: number }>;
  manageAssignment: (
    assignmentId: string,
    action: AssignmentManagementAction,
    instruction?: string,
  ) => Promise<void>;
  setBatchInstruction: (
    batchId: string,
    instruction: string,
  ) => Promise<{ updatedCount: number; failedCount: number }>;
  closeBatch: (
    batchId: string,
  ) => Promise<{ updatedCount: number; failedCount: number }>;
  openAssignment: (assignmentId: string) => Promise<void>;
  updateLearning: (
    assignmentId: string,
    action: "start" | "toggle_complete" | "note",
    note?: string,
  ) => Promise<void>;
  saveSubmission: (input: SubmissionDraftInput) => Promise<string>;
  saveAndSubmit: (input: SubmissionDraftInput) => Promise<string>;
  submitAssignment: (assignmentId: string) => Promise<string>;
  createFeedback: (input: FeedbackInput) => Promise<string>;
  markFeedbackRead: (assignmentId: string) => Promise<void>;
  uploadFile: (file: File, scope: UploadScope) => Promise<FileAsset>;
}

const AppContext = createContext<AppContextValue | null>(null);

// Fire-and-forget: assignment notification email is best-effort and must
// never block or fail the assignment flow itself.
function notifyAssignmentBatch(batchId: string) {
  fetch("/api/admin/notifications/assignment-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId }),
  }).catch(() => undefined);
}

function notifyStudentEvent(type: "submitted" | "reply", assignmentId: string) {
  fetch("/api/notifications/student-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, assignmentId }),
  }).catch(() => undefined);
}

function notifyFeedbackMessage(messageId: string) {
  fetch("/api/admin/notifications/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId }),
  }).catch(() => undefined);
}

function toSession(profile: AppState["profiles"][number]): SessionUser {
  return {
    id: profile.id,
    role: profile.role,
    loginId: profile.loginId,
    displayName: profile.displayName,
    mustChangePassword: profile.mustChangePassword,
  };
}

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);
}

async function fileToDemoAsset(file: File): Promise<FileAsset> {
  const url =
    file.size <= 2 * 1024 * 1024
      ? await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
          reader.readAsDataURL(file);
        })
      : undefined;
  return {
    id: `asset-${nanoid(10)}`,
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    url,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const mode = isSupabaseConfigured ? "supabase" : "demo";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const repository = useMemo(
    () => (supabase ? new SupabaseRepository(supabase) : null),
    [supabase],
  );
  const [state, setState] = useState<AppState>(() =>
    mode === "demo" ? createDemoSeed() : getEmptyState(),
  );
  const [session, setSession] = useState<SessionUser | null>(null);
  const [credentials, setCredentials] =
    useState<Record<string, string>>(demoCredentials);
  const [ready, setReady] = useState(false);
  const lastSupabaseRefreshAtRef = useRef(0);
  const scheduledRefreshInFlightRef = useRef(false);

  const persistDemo = useCallback(
    (
      nextState: AppState,
      nextSession = session,
      nextCredentials = credentials,
    ) => {
      if (mode !== "demo" || typeof window === "undefined") return;
      localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
      if (nextSession) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
      localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(nextCredentials));
    },
    [credentials, mode, session],
  );

  const refresh = useCallback(async () => {
    if (!repository || !supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setState(getEmptyState());
      setSession(null);
      return;
    }
    const next = await repository.loadState();
    setState(next);
    const profile = next.profiles.find((item) => item.id === user.id);
    if (!profile) throw new Error("프로필 정보를 찾을 수 없습니다.");
    setSession(toSession(profile));
    lastSupabaseRefreshAtRef.current = Date.now();
  }, [repository, supabase]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      if (mode === "demo") {
        try {
          const storedState = localStorage.getItem(STATE_KEY);
          const storedSession = localStorage.getItem(SESSION_KEY);
          const storedCredentials = localStorage.getItem(CREDENTIAL_KEY);
          if (storedState) setState(JSON.parse(storedState) as AppState);
          if (storedSession)
            setSession(JSON.parse(storedSession) as SessionUser);
          if (storedCredentials)
            setCredentials({
              ...demoCredentials,
              ...(JSON.parse(storedCredentials) as Record<string, string>),
            });
        } catch {
          const seed = createDemoSeed();
          setState(seed);
          localStorage.setItem(STATE_KEY, JSON.stringify(seed));
        }
      } else {
        await refresh();
      }
      if (active) setReady(true);
    }
    initialize().catch(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [mode, refresh]);

  useEffect(() => {
    if (mode !== "supabase") return;

    const refreshSignedAssetUrlsIfNeeded = () => {
      if (
        document.visibilityState !== "visible" ||
        scheduledRefreshInFlightRef.current ||
        Date.now() - lastSupabaseRefreshAtRef.current <
          SIGNED_ASSET_URL_REFRESH_INTERVAL_MS
      ) {
        return;
      }

      scheduledRefreshInFlightRef.current = true;
      void refresh()
        .catch(() => undefined)
        .finally(() => {
          scheduledRefreshInFlightRef.current = false;
        });
    };

    const intervalId = window.setInterval(
      refreshSignedAssetUrlsIfNeeded,
      SIGNED_ASSET_URL_REFRESH_INTERVAL_MS,
    );
    window.addEventListener("focus", refreshSignedAssetUrlsIfNeeded);
    document.addEventListener(
      "visibilitychange",
      refreshSignedAssetUrlsIfNeeded,
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSignedAssetUrlsIfNeeded);
      document.removeEventListener(
        "visibilitychange",
        refreshSignedAssetUrlsIfNeeded,
      );
    };
  }, [mode, refresh]);

  const commitDemo = useCallback(
    (next: AppState) => {
      setState(next);
      persistDemo(next);
    },
    [persistDemo],
  );

  const login = useCallback(
    async (rawLoginId: string, password: string) => {
      const loginId = loginIdSchema.parse(rawLoginId);
      if (mode === "demo") {
        const profile = state.profiles.find((item) => item.loginId === loginId);
        if (
          !profile ||
          !profile.isActive ||
          credentials[loginId] !== password
        ) {
          throw new Error("아이디 또는 비밀번호를 확인하세요.");
        }
        const nextState = structuredClone(state);
        const storedProfile = nextState.profiles.find(
          (item) => item.id === profile.id,
        )!;
        storedProfile.lastLoginAt = new Date().toISOString();
        const nextSession = toSession(storedProfile);
        setState(nextState);
        setSession(nextSession);
        persistDemo(nextState, nextSession);
        return nextSession;
      }
      if (!supabase || !repository)
        throw new Error("Supabase 연결 정보가 없습니다.");
      const { error } = await supabase.auth.signInWithPassword({
        email: toAuthEmail(loginId),
        password,
      });
      if (error) throw new Error("아이디 또는 비밀번호를 확인하세요.");
      const {
        data: { user: signedInUser },
      } = await supabase.auth.getUser();
      if (signedInUser) {
        await supabase
          .from("gqai_aistudy_profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", signedInUser.id);
      }
      const nextState = await repository.loadState();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const profile = nextState.profiles.find((item) => item.id === user?.id);
      if (!profile || !profile.isActive) {
        await supabase.auth.signOut();
        throw new Error("사용할 수 없는 계정입니다. 강사에게 문의하세요.");
      }
      lastSupabaseRefreshAtRef.current = Date.now();
      const nextSession = toSession(profile);
      setState(nextState);
      setSession(nextSession);
      return nextSession;
    },
    [credentials, mode, persistDemo, repository, state, supabase],
  );

  const logout = useCallback(async () => {
    if (mode === "supabase" && supabase) await supabase.auth.signOut();
    setSession(null);
    if (mode === "demo") {
      localStorage.removeItem(SESSION_KEY);
    } else {
      setState(getEmptyState());
    }
  }, [mode, supabase]);

  const changePassword = useCallback(
    async (password: string) => {
      passwordSchema.parse(password);
      if (!session) throw new Error("로그인이 필요합니다.");
      if (mode === "demo") {
        const nextState = structuredClone(state);
        const profile = nextState.profiles.find(
          (item) => item.id === session.id,
        )!;
        profile.mustChangePassword = false;
        const nextCredentials = {
          ...credentials,
          [profile.loginId]: password,
        };
        const nextSession = { ...session, mustChangePassword: false };
        setCredentials(nextCredentials);
        setState(nextState);
        setSession(nextSession);
        persistDemo(nextState, nextSession, nextCredentials);
        return;
      }
      if (!supabase) throw new Error("Supabase 연결 정보가 없습니다.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      const { error: profileError } = await supabase
        .from("gqai_aistudy_profiles")
        .update({ must_change_password: false })
        .eq("id", session.id);
      if (profileError) throw new Error(profileError.message);
      await refresh();
    },
    [credentials, mode, persistDemo, refresh, session, state, supabase],
  );

  const resetDemo = useCallback(() => {
    const next = createDemoSeed();
    setState(next);
    setSession(null);
    setCredentials(demoCredentials);
    localStorage.setItem(STATE_KEY, JSON.stringify(next));
    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(demoCredentials));
  }, []);

  const createStudent = useCallback(
    async (rawInput: CreateStudentInput) => {
      const input = studentSchema.parse(rawInput);
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      if (mode === "supabase") {
        const response = await fetch("/api/admin/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const result = (await response.json()) as {
          id?: string;
          error?: string;
        };
        if (!response.ok || !result.id)
          throw new Error(result.error ?? "학생을 만들지 못했습니다.");
        await refresh();
        return result.id;
      }
      if (state.profiles.some((item) => item.loginId === input.loginId))
        throw new Error("이미 사용 중인 아이디입니다.");
      const id = `profile-${nanoid(10)}`;
      const stamp = new Date().toISOString();
      const next = structuredClone(state);
      next.profiles.push({
        id,
        role: "student",
        loginId: input.loginId,
        displayName: input.displayName,
        email: input.email || undefined,
        mustChangePassword: true,
        isActive: true,
        createdAt: stamp,
      });
      for (const group of next.groups) {
        if (
          input.groupIds.includes(group.id) &&
          !group.memberIds.includes(id)
        ) {
          group.memberIds.push(id);
          group.updatedAt = stamp;
        }
      }
      const nextCredentials = {
        ...credentials,
        [input.loginId]: input.password,
      };
      setCredentials(nextCredentials);
      setState(next);
      persistDemo(next, session, nextCredentials);
      return id;
    },
    [credentials, mode, persistDemo, refresh, session, state],
  );

  const resetStudentPassword = useCallback(
    async (studentId: string, password: string) => {
      passwordSchema.parse(password);
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      const profile = state.profiles.find((item) => item.id === studentId);
      if (!profile) throw new Error("학생을 찾을 수 없습니다.");
      if (mode === "supabase") {
        const response = await fetch(`/api/admin/students/${studentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset_password", password }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(result.error ?? "비밀번호를 재설정하지 못했습니다.");
        await refresh();
        return;
      }
      const next = structuredClone(state);
      const target = next.profiles.find((item) => item.id === studentId)!;
      target.mustChangePassword = true;
      const nextCredentials = { ...credentials, [target.loginId]: password };
      setCredentials(nextCredentials);
      setState(next);
      persistDemo(next, session, nextCredentials);
    },
    [credentials, mode, persistDemo, refresh, session, state],
  );

  const toggleStudentActive = useCallback(
    async (studentId: string) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      const profile = state.profiles.find((item) => item.id === studentId);
      if (!profile) throw new Error("학생을 찾을 수 없습니다.");
      if (mode === "supabase") {
        const response = await fetch(`/api/admin/students/${studentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_active",
            isActive: !profile.isActive,
          }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(result.error ?? "계정 상태를 바꾸지 못했습니다.");
        await refresh();
        return;
      }
      const next = structuredClone(state);
      const target = next.profiles.find((item) => item.id === studentId)!;
      target.isActive = !target.isActive;
      commitDemo(next);
    },
    [commitDemo, mode, refresh, session, state],
  );

  const updateStudentEmail = useCallback(
    async (studentId: string, email: string) => {
      const normalized = email.trim() ? emailSchema.parse(email) : "";
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      if (mode === "supabase") {
        const response = await fetch(`/api/admin/students/${studentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set_email", email: normalized }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(result.error ?? "이메일을 저장하지 못했습니다.");
        await refresh();
        return;
      }
      const next = structuredClone(state);
      const target = next.profiles.find((item) => item.id === studentId);
      if (!target) throw new Error("학생을 찾을 수 없습니다.");
      target.email = normalized || undefined;
      setState(next);
      persistDemo(next);
    },
    [mode, persistDemo, refresh, session, state],
  );

  const updateMyEmail = useCallback(
    async (email: string) => {
      const normalized = email.trim() ? emailSchema.parse(email) : "";
      if (!session) throw new Error("로그인이 필요합니다.");
      if (mode === "supabase") {
        if (!supabase) throw new Error("Supabase 연결 정보가 없습니다.");
        const { error } = await supabase
          .from("gqai_aistudy_profiles")
          .update({ email: normalized || null })
          .eq("id", session.id);
        if (error) throw new Error(error.message);
        await refresh();
        return;
      }
      const next = structuredClone(state);
      const target = next.profiles.find((item) => item.id === session.id);
      if (!target) throw new Error("프로필을 찾을 수 없습니다.");
      target.email = normalized || undefined;
      setState(next);
      persistDemo(next);
    },
    [mode, persistDemo, refresh, session, state, supabase],
  );

  const createGroup = useCallback(
    async (rawInput: CreateGroupInput) => {
      const input = groupSchema.parse(rawInput);
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      if (repository) {
        const id = await repository.createGroup(input);
        await refresh();
        return id;
      }
      const id = `group-${nanoid(10)}`;
      const stamp = new Date().toISOString();
      const next = structuredClone(state);
      next.groups.unshift({
        id,
        ...input,
        isArchived: false,
        createdAt: stamp,
        updatedAt: stamp,
      });
      commitDemo(next);
      return id;
    },
    [commitDemo, refresh, repository, session, state],
  );

  const updateGroup = useCallback(
    async (groupId: string, rawInput: CreateGroupInput) => {
      const input = groupSchema.parse(rawInput);
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      if (repository) {
        await repository.updateGroup(groupId, input);
        await refresh();
        return;
      }
      const next = structuredClone(state);
      const group = next.groups.find((item) => item.id === groupId);
      if (!group) throw new Error("그룹을 찾을 수 없습니다.");
      Object.assign(group, input, { updatedAt: new Date().toISOString() });
      commitDemo(next);
    },
    [commitDemo, refresh, repository, session, state],
  );

  const archiveGroup = useCallback(
    async (groupId: string) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      const group = state.groups.find((item) => item.id === groupId);
      if (!group) throw new Error("그룹을 찾을 수 없습니다.");
      if (repository) {
        await repository.archiveGroup(groupId, !group.isArchived);
        await refresh();
        return;
      }
      const next = structuredClone(state);
      const target = next.groups.find((item) => item.id === groupId)!;
      target.isArchived = !target.isArchived;
      target.updatedAt = new Date().toISOString();
      commitDemo(next);
    },
    [commitDemo, refresh, repository, session, state],
  );

  const createModule = useCallback(async () => {
    if (!session || session.role !== "admin")
      throw new Error("관리자 권한이 필요합니다.");
    if (repository) {
      const id = await repository.createDraftModule(newBlankSnapshot());
      await refresh();
      return id;
    }
    const result = createDraftModule(state, session.id);
    commitDemo(result.state);
    return result.moduleId;
  }, [commitDemo, refresh, repository, session, state]);

  const saveModule = useCallback(
    async (moduleId: string, snapshot: ModuleSnapshot) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      validateModuleSnapshot(snapshot);
      if (repository) {
        await repository.saveModule(moduleId, snapshot);
        await refresh();
        return;
      }
      commitDemo(saveModuleDraft(state, moduleId, snapshot, session.id));
    },
    [commitDemo, refresh, repository, session, state],
  );

  const publishModule = useCallback(
    async (moduleId: string) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      if (repository) {
        const versionId = await repository.publishModule(moduleId);
        await refresh();
        return versionId;
      }
      const result = publishModuleState(state, moduleId, session.id);
      commitDemo(result.state);
      return result.versionId;
    },
    [commitDemo, refresh, repository, session, state],
  );

  const duplicateModule = useCallback(
    async (moduleId: string) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      const source = state.modules.find((item) => item.id === moduleId);
      if (!source) throw new Error("모듈을 찾을 수 없습니다.");
      if (repository) {
        const id = await repository.createDraftModule({
          ...structuredClone(source.draft),
          title: `${source.draft.title} 복사본`,
        });
        await refresh();
        return id;
      }
      const result = duplicateModuleState(state, moduleId, session.id);
      commitDemo(result.state);
      return result.moduleId;
    },
    [commitDemo, refresh, repository, session, state],
  );

  const archiveModule = useCallback(
    async (moduleId: string) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      const template = state.modules.find((item) => item.id === moduleId);
      if (!template) throw new Error("모듈을 찾을 수 없습니다.");
      if (repository) {
        await repository.archiveModule(
          moduleId,
          template.status !== "archived",
        );
        await refresh();
        return;
      }
      commitDemo(archiveModuleState(state, moduleId, session.id));
    },
    [commitDemo, refresh, repository, session, state],
  );

  const assign = useCallback(
    async (input: AssignmentInput) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      if (repository) {
        const id = await repository.assign(input);
        await refresh();
        notifyAssignmentBatch(id);
        return id;
      }
      const result = createAssignmentBatch(state, input, session.id);
      commitDemo(result.state);
      return result.batchId;
    },
    [commitDemo, refresh, repository, session, state],
  );

  const assignMany = useCallback(
    async (inputs: AssignmentInput[]) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      if (!inputs.length) return { createdCount: 0, failedCount: 0 };
      if (repository) {
        // One idempotency key per submission, suffixed per batch, so a
        // retried plan reuses the same keys instead of minting new ones
        // that bypass the database's duplicate-batch guard.
        const planKey = crypto.randomUUID();
        const batchIds: string[] = [];
        let failedCount = 0;
        for (let index = 0; index < inputs.length; index += 1) {
          try {
            batchIds.push(
              await repository.assign(inputs[index], `${planKey}:${index}`),
            );
          } catch {
            failedCount += 1;
          }
        }
        const next = await repository.loadState();
        setState(next);
        lastSupabaseRefreshAtRef.current = Date.now();
        const createdCount = next.assignments.filter((item) =>
          batchIds.includes(item.assignmentBatchId),
        ).length;
        batchIds.forEach(notifyAssignmentBatch);
        return { createdCount, failedCount };
      }
      // Fold sequentially over a local working copy instead of calling the
      // single-batch demo path per input: each of those reads the state
      // captured when this callback was created, so later calls in the same
      // submission would overwrite earlier ones instead of accumulating.
      let workingState = state;
      let createdCount = 0;
      let failedCount = 0;
      for (const input of inputs) {
        try {
          const result = createAssignmentBatch(workingState, input, session.id);
          workingState = result.state;
          createdCount += result.assignmentIds.length;
        } catch {
          failedCount += 1;
        }
      }
      commitDemo(workingState);
      return { createdCount, failedCount };
    },
    [commitDemo, repository, session, state],
  );

  const reorderAssignments = useCallback(
    async (kind: "student" | "group", targetId: string, ids: string[]) => {
      if (session?.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      const next = reorderAssignmentsState(state, kind, targetId, ids);
      if (repository) {
        await repository.reorderAssignments(kind, targetId, ids);
        await refresh();
      } else commitDemo(next);
    },
    [commitDemo, refresh, repository, session, state],
  );

  const manageAssignment = useCallback(
    async (
      assignmentId: string,
      action: AssignmentManagementAction,
      instruction = "",
    ) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      if (repository) {
        await repository.manageAssignment(assignmentId, action, instruction);
        await refresh();
        return;
      }
      commitDemo(
        manageAssignmentState(
          state,
          assignmentId,
          action,
          session.id,
          instruction,
        ),
      );
    },
    [commitDemo, refresh, repository, session, state],
  );

  // A group-sourced batch is managed as one unit going forward: bulk actions
  // fold sequentially over a local state copy for the same reason assignMany
  // does — looping the single-assignment path would have each call read the
  // pre-loop React state and overwrite the ones before it.
  const setBatchInstruction = useCallback(
    async (batchId: string, instruction: string) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      const targets = state.assignments.filter(
        (item) =>
          item.assignmentBatchId === batchId &&
          !["completed", "cancelled", "stopped"].includes(
            item.assignmentStatus,
          ),
      );
      if (repository) {
        let updatedCount = 0;
        let failedCount = 0;
        for (const assignment of targets) {
          try {
            await repository.manageAssignment(
              assignment.id,
              "set_instruction",
              instruction,
            );
            updatedCount += 1;
          } catch {
            failedCount += 1;
          }
        }
        await refresh();
        return { updatedCount, failedCount };
      }
      let workingState = state;
      let updatedCount = 0;
      let failedCount = 0;
      for (const assignment of targets) {
        try {
          workingState = manageAssignmentState(
            workingState,
            assignment.id,
            "set_instruction",
            session.id,
            instruction,
          );
          updatedCount += 1;
        } catch {
          failedCount += 1;
        }
      }
      commitDemo(workingState);
      return { updatedCount, failedCount };
    },
    [commitDemo, refresh, repository, session, state],
  );

  const closeBatch = useCallback(
    async (batchId: string) => {
      if (!session || session.role !== "admin")
        throw new Error("관리자 권한이 필요합니다.");
      const targets = state.assignments.filter(
        (item) =>
          item.assignmentBatchId === batchId &&
          !["completed", "cancelled", "stopped"].includes(
            item.assignmentStatus,
          ),
      );
      // Mirrors the single-card rule in AssignmentDetailView: a card with no
      // activity is cancelled, one with activity is stopped. A batch mixes
      // both kinds of members, so each gets its own correct action instead
      // of one action forced on the whole batch.
      function actionFor(assignmentId: string): "cancel" | "stop" {
        const assignment = state.assignments.find(
          (item) => item.id === assignmentId,
        )!;
        const hasActivity = Boolean(
          assignment.firstOpenedAt ||
          assignment.startedAt ||
          assignment.courseCompletedAt ||
          state.submissions.some(
            (submission) =>
              submission.assignmentId === assignmentId &&
              submission.status !== "draft",
          ),
        );
        return hasActivity ? "stop" : "cancel";
      }
      if (repository) {
        let updatedCount = 0;
        let failedCount = 0;
        for (const assignment of targets) {
          try {
            await repository.manageAssignment(
              assignment.id,
              actionFor(assignment.id),
            );
            updatedCount += 1;
          } catch {
            failedCount += 1;
          }
        }
        await refresh();
        return { updatedCount, failedCount };
      }
      let workingState = state;
      let updatedCount = 0;
      let failedCount = 0;
      for (const assignment of targets) {
        try {
          workingState = manageAssignmentState(
            workingState,
            assignment.id,
            actionFor(assignment.id),
            session.id,
          );
          updatedCount += 1;
        } catch {
          failedCount += 1;
        }
      }
      commitDemo(workingState);
      return { updatedCount, failedCount };
    },
    [commitDemo, refresh, repository, session, state],
  );

  const openAssignment = useCallback(
    async (assignmentId: string) => {
      if (!session || session.role !== "student") return;
      if (repository) {
        await repository.updateLearning(assignmentId, "open");
        await refresh();
        return;
      }
      commitDemo(markAssignmentOpened(state, assignmentId, session.id));
    },
    [commitDemo, refresh, repository, session, state],
  );

  const updateLearning = useCallback(
    async (
      assignmentId: string,
      action: "start" | "toggle_complete" | "note",
      note?: string,
    ) => {
      if (!session || session.role !== "student")
        throw new Error("학생 로그인이 필요합니다.");
      if (repository) {
        await repository.updateLearning(assignmentId, action, note);
        await refresh();
        return;
      }
      commitDemo(
        updateLearningState(state, assignmentId, session.id, action, note),
      );
    },
    [commitDemo, refresh, repository, session, state],
  );

  const saveSubmission = useCallback(
    async (input: SubmissionDraftInput) => {
      if (!session || session.role !== "student")
        throw new Error("학생 로그인이 필요합니다.");
      validateSubmissionItems(input.items);
      if (repository) {
        const id = await repository.saveDraft(input);
        await refresh();
        return id;
      }
      const result = saveSubmissionDraft(state, input, session.id);
      commitDemo(result.state);
      return result.submissionId;
    },
    [commitDemo, refresh, repository, session, state],
  );

  const submitAssignment = useCallback(
    async (assignmentId: string) => {
      if (!session || session.role !== "student")
        throw new Error("학생 로그인이 필요합니다.");
      if (repository) {
        const id = await repository.submit(assignmentId);
        await refresh();
        notifyStudentEvent("submitted", assignmentId);
        return id;
      }
      const result = submitDraft(state, assignmentId, session.id);
      commitDemo(result.state);
      return result.submissionId;
    },
    [commitDemo, refresh, repository, session, state],
  );

  const saveAndSubmit = useCallback(
    async (input: SubmissionDraftInput) => {
      if (!session || session.role !== "student")
        throw new Error("학생 로그인이 필요합니다.");
      validateSubmissionItems(input.items);
      if (repository) {
        await repository.saveDraft(input);
        const id = await repository.submit(input.assignmentId);
        await refresh();
        notifyStudentEvent("submitted", input.assignmentId);
        return id;
      }
      const saved = saveSubmissionDraft(state, input, session.id);
      const submitted = submitDraft(
        saved.state,
        input.assignmentId,
        session.id,
      );
      commitDemo(submitted.state);
      return submitted.submissionId;
    },
    [commitDemo, refresh, repository, session, state],
  );

  const createFeedback = useCallback(
    async (input: FeedbackInput) => {
      if (!session) throw new Error("로그인이 필요합니다.");
      if (repository) {
        const id = await repository.createFeedback(input);
        await refresh();
        if (session.role === "admin") notifyFeedbackMessage(id);
        else notifyStudentEvent("reply", input.assignmentId);
        return id;
      }
      const result = createFeedbackState(state, input, session.id);
      commitDemo(result.state);
      return result.messageId;
    },
    [commitDemo, refresh, repository, session, state],
  );

  const markFeedbackRead = useCallback(
    async (assignmentId: string) => {
      if (!session || session.role !== "student") return;
      if (repository) {
        await repository.markFeedbackRead(assignmentId);
        await refresh();
        return;
      }
      commitDemo(markFeedbackReadState(state, assignmentId, session.id));
    },
    [commitDemo, refresh, repository, session, state],
  );

  const uploadFile = useCallback(
    async (file: File, scope: UploadScope) => {
      const error = validateFile(file);
      if (error) throw new Error(error);
      if (!session) throw new Error("로그인이 필요합니다.");
      if (!repository) return fileToDemoAsset(file);
      const assetId = crypto.randomUUID();
      const filename = safeFileName(file.name) || "file";
      if (scope.kind === "module") {
        return repository.upload(
          "gqai-aistudy-module-assets",
          `${scope.moduleId}/${assetId}/${filename}`,
          file,
        );
      }
      if (scope.kind === "submission") {
        return repository.upload(
          "gqai-aistudy-submission-assets",
          `${session.id}/${scope.assignmentId}/${scope.submissionId ?? "draft"}/${assetId}/${filename}`,
          file,
        );
      }
      return repository.upload(
        "gqai-aistudy-feedback-assets",
        `${scope.assignmentId}/${scope.messageId ?? "draft"}/${assetId}/${filename}`,
        file,
      );
    },
    [repository, session],
  );

  const saveAnnouncement = useCallback(async (input: AnnouncementInput) => {
    if (session?.role !== "admin") throw new Error("관리자 권한이 필요합니다.");
    const valid = validateAnnouncement(input);
    if (repository) {
      await repository.saveAnnouncement(valid);
      await refresh();
      return;
    }
    if (valid.scope === "student" && !state.profiles.some((p) => p.id === valid.targetId && p.role === "student")) throw new Error("학생을 찾을 수 없습니다.");
    if (valid.scope === "group" && !state.groups.some((g) => g.id === valid.targetId)) throw new Error("그룹을 찾을 수 없습니다.");
    const notices = state.announcements ?? [];
    const existing = notices.find((n) => n.id === valid.id);
    if (valid.id && !existing) throw new Error("공지를 찾을 수 없습니다.");
    const now = new Date().toISOString();
    const notice = { ...valid, id: valid.id ?? nanoid(), archived: valid.archived ?? false, createdAt: existing?.createdAt ?? now, updatedAt: now };
    commitDemo({ ...state, announcements: [notice, ...notices.filter((n) => n.id !== notice.id)] });
  }, [session, repository, refresh, state, commitDemo]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      session,
      ready,
      saveAnnouncement,
      mode,
      refresh,
      login,
      logout,
      changePassword,
      resetDemo,
      createStudent,
      resetStudentPassword,
      toggleStudentActive,
      updateMyEmail,
      updateStudentEmail,
      createGroup,
      updateGroup,
      archiveGroup,
      createModule,
      saveModule,
      publishModule,
      duplicateModule,
      archiveModule,
      assign,
      assignMany,
      manageAssignment,
      reorderAssignments,
      setBatchInstruction,
      closeBatch,
      openAssignment,
      updateLearning,
      saveSubmission,
      saveAndSubmit,
      submitAssignment,
      createFeedback,
      markFeedbackRead,
      uploadFile,
    }),
    [
      archiveGroup,
      saveAnnouncement,
      archiveModule,
      assign,
      assignMany,
      manageAssignment,
      reorderAssignments,
      setBatchInstruction,
      closeBatch,
      changePassword,
      createFeedback,
      createGroup,
      createModule,
      createStudent,
      duplicateModule,
      login,
      logout,
      markFeedbackRead,
      mode,
      openAssignment,
      publishModule,
      ready,
      refresh,
      resetDemo,
      resetStudentPassword,
      saveModule,
      saveAndSubmit,
      saveSubmission,
      session,
      state,
      submitAssignment,
      toggleStudentActive,
      updateMyEmail,
      updateStudentEmail,
      updateGroup,
      updateLearning,
      uploadFile,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider 안에서 useApp을 사용해야 합니다.");
  return value;
}
