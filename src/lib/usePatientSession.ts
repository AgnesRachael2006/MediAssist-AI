"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";
import { LOGGED_IN_PATIENT_ID } from "@/lib/mockData";

export function usePatientSession() {
  const [patientId, setPatientId] = useState(LOGGED_IN_PATIENT_ID);
  const [name, setName] = useState("Arun");

  useEffect(() => {
    const session = getSession();
    if (session?.role !== "patient") return;
    const nextName = session.name || "Arun";
    const nextId = session.profileId || LOGGED_IN_PATIENT_ID;
    queueMicrotask(() => {
      setName(nextName);
      setPatientId(nextId);
    });
  }, []);

  return { patientId, name };
}
