import { useApiQuery } from "@/hooks/api-hooks";

interface PollVoteStatus {
  hasVoted: boolean;
  userChoices: string[];
}

export function usePollVoteStatus(postId: string) {
  return useApiQuery<PollVoteStatus>(
    ['/api/forum/posts', postId, 'user-vote-status'],
    `/api/forum/posts/${postId}/user-vote-status`,
    undefined,
    { enabled: !!postId }
  );
}