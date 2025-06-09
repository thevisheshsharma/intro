import React from 'react';
import { TwitterProfileCard } from './profile-card';

interface SearchedProfileCardProps {
  user: any | null;
}

export const SearchedProfileCard: React.FC<SearchedProfileCardProps> = ({ user }) => {
  if (!user) return null;
  return <TwitterProfileCard user={user} />;
};
