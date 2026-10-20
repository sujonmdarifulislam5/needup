export function canOfferHelp(post: { post_type: string; user_id: string; status: string }, userId: string | undefined) {
  return !!userId && post.post_type === "NEED" && post.status === "open" && post.user_id !== userId;
}

export function canChangePostStatus(ownerId: string, userId: string | undefined) {
  return !!userId && ownerId === userId;
}