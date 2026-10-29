import { initialsOf } from '../lib/utils.js';

export default function Avatar({ profile, size = 30 }) {
  return (
    <span
      className="kao-avatar"
      title={profile?.display_name || ''}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initialsOf(profile)}
    </span>
  );
}
