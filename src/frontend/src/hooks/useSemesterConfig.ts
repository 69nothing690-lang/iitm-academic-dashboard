import { useQuery } from "@tanstack/react-query";
import type { SemesterConfig } from "../backend.d";
import { useActor } from "./useActor";

export function useSemesterConfig() {
  const { actor, isFetching } = useActor();

  const query = useQuery<SemesterConfig | null>({
    queryKey: ["activeSemesterConfig"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getActiveSemesterConfig();
    },
    enabled: !!actor && !isFetching,
    staleTime: 5 * 60 * 1000,
  });

  return {
    semConfig: query.data ?? null,
    loading: query.isLoading,
  };
}
