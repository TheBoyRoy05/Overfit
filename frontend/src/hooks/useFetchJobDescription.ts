import { useState, useCallback } from "react";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase";

export type FetchResult =
  | {
      success: true;
      description: string;
      title: string | null;
      company: string;
      roleId: string;
      hourly_range: number[] | null;
      locations: string[] | null;
      skills: string[] | null;
    }
  | { success: false; error: string };

export interface UseFetchJobDescriptionResult {
  isFetching: boolean;
  fetchJobDescription: (url: string) => Promise<FetchResult>;
}

export function useFetchJobDescription(): UseFetchJobDescriptionResult {
  const [isFetching, setIsFetching] = useState(false);

  const fetchJobDescription = useCallback(async (url: string): Promise<FetchResult> => {
    const trimmed = url.trim();
    if (!trimmed) {
      return { success: false, error: "URL is required." };
    }

    setIsFetching(true);

    try {
      const functionsUrl = import.meta.env.DEV
        ? `${window.location.origin}/api/functions/v1/fetch-job`
        : `${supabaseUrl}/functions/v1/fetch-job`;

      const res = await fetch(functionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey ?? "",
          Authorization: `Bearer ${supabaseAnonKey ?? ""}`,
        },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error ?? `Failed to fetch: ${res.status} ${res.statusText}`,
        };
      }

      const { description, title, company, roleId, hourly_range, locations, skills } = data;
      if (!description) {
        return {
          success: false,
          error: "Could not find job description on this page.",
        };
      }

      return {
        success: true,
        description,
        title: title ?? null,
        company: company ?? "unknown",
        roleId: roleId ?? "manual",
        hourly_range: hourly_range ?? null,
        locations: locations ?? null,
        skills: skills ?? null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch URL";
      return { success: false, error: message };
    } finally {
      setIsFetching(false);
    }
  }, []);

  return { isFetching, fetchJobDescription };
}
