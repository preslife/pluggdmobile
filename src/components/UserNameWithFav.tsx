import { useFavNicknames } from "@/hooks/useFavNicknames";
import { FavNicknameDisplay } from "./FavNicknameDisplay";

interface UserNameWithFavProps {
  userId: string;
  username?: string;
  fullName?: string;
  showFavAsPreferred?: boolean; // If true, shows FAV nickname instead of username when available
  className?: string;
}

export const UserNameWithFav = ({ 
  userId, 
  username, 
  fullName, 
  showFavAsPreferred = false,
  className 
}: UserNameWithFavProps) => {
  const { primaryNickname, hasNicknames } = useFavNicknames(userId);

  // If user has FAV nicknames and preference is to show FAV as preferred name
  if (showFavAsPreferred && hasNicknames && primaryNickname) {
    return (
      <span className={className}>
        <FavNicknameDisplay userId={userId} variant="inline" />
      </span>
    );
  }

  // Default behavior: show regular name with optional FAV nickname badge
  const displayName = fullName || username || 'Unknown User';

  return (
    <span className={className}>
      {displayName}
      {hasNicknames && (
        <FavNicknameDisplay 
          userId={userId} 
          variant="comment" 
          className="ml-2" 
        />
      )}
    </span>
  );
};

export default UserNameWithFav;