"use client";

interface ProfileCardProps {
  profile: {
    name: string;
    fitnessLevel: string;
    goal: string;
    age: number;
    weight: number;
  };
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-primary">Your Profile</h3>

      <div className="space-y-3">
        <div>
          <p className="text-gray-400 text-sm">Name</p>
          <p className="text-white font-semibold">{profile.name}</p>
        </div>

        <div>
          <p className="text-gray-400 text-sm">Fitness Level</p>
          <p className="text-white font-semibold capitalize">
            {profile.fitnessLevel}
          </p>
        </div>

        <div>
          <p className="text-gray-400 text-sm">Goal</p>
          <p className="text-white font-semibold">{profile.goal}</p>
        </div>

        <div className="pt-2 border-t border-primary/30 mt-3">
          <p className="text-gray-400 text-sm">Age</p>
          <p className="text-white font-semibold">{profile.age} years</p>
        </div>

        <div>
          <p className="text-gray-400 text-sm">Weight</p>
          <p className="text-white font-semibold">{profile.weight} lbs</p>
        </div>
      </div>

      <button className="w-full mt-4 btn-secondary text-sm">
        Edit Profile
      </button>
    </div>
  );
}
