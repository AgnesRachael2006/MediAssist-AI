import { DoctorShell } from "@/components/layout/DoctorShell";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <DoctorShell>{children}</DoctorShell>;
}
