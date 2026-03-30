import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface SlotExamDate {
    slot: string;
    quiz1: string;
    quiz2: string;
    endSem: string;
}
export interface SemesterConfig {
    id: string;
    semType: string;
    holidays: Array<Holiday>;
    quiz1Start: string;
    name: string;
    year: bigint;
    isActive: boolean;
    slotExamDates: Array<SlotExamDate>;
    endSemStart: string;
    events: Array<Holiday>;
    quiz1End: string;
    quiz2End: string;
    quiz2Start: string;
    endSemEnd: string;
    classStart: string;
    classEnd: string;
}
export interface Holiday {
    date: string;
    name: string;
}
export interface UserProfile {
    name: string;
}
export type AcademicData = string;
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteSemesterConfig(id: string): Promise<void>;
    getActiveSemesterConfig(): Promise<SemesterConfig | null>;
    getCallerSnapshot(): Promise<AcademicData | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listSemesterConfigs(): Promise<Array<SemesterConfig>>;
    saveCallerSnapshot(snapshot: AcademicData): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveSemesterConfig(config: SemesterConfig): Promise<void>;
    setActiveSemester(id: string): Promise<void>;
}
