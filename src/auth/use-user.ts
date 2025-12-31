import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getUser } from "./get-user";
import type { User } from "./server";

export const useUser = () => useSuspenseQuery(useUserQueryOptions);
export const useUserQueryOptions = queryOptions({
  queryKey: ["user"],
  queryFn: getUser,
});

export function isUserAuthenticated(user: Partial<User>) {
  if (user.isAnonymous) {
    return false;
  }
  return !!user.email || !!user.name;
}
