import { useState, useContext, useEffect } from "react";
import { UserContext } from "../../context/UserContext";
import { UserCog, RefreshCw } from "lucide-react";
import { NavLink, useParams } from "react-router-dom";
import LeetcodeData from "../../components/Profile/subprofiles/LeetcodeData.jsx";
import CodeforcesData from "../../components/Profile/subprofiles/Codeforces.jsx";
import UserStats from "../../components/Profile/subprofiles/UserStats.jsx";
import ProfileSidebar from "./ProfileSidebar";
import { getBasicInfo } from "../../api/auth.api.js";
import { toast } from "react-hot-toast";
import {
  getAllUserStats,
  getUserLeetCodeStats,
  getUserCodeForcesStats,
  syncAll,
} from "../../api/platformApi.js";

const syncToastId = "profile-sync";

function readAutoSyncDay(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveAutoSyncDay(key, day) {
  try {
    localStorage.setItem(key, day);
  } catch {
    // The server still enforces the daily limit when storage is unavailable.
  }
}

function Profile() {
  const { username } = useParams();
  const [activeTab, setActiveTab] = useState("userStats");
  const { user, isAuthLoading } = useContext(UserContext);
  const [isSyncing, setIsSyncing] = useState(false);
  const [leetcodeData, setLeetCodeData] = useState();
  const [codeforcesData, setCodeforcesData] = useState();
  const [allStats, setAllStats] = useState();
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [userData, setUserData] = useState({
    name: "",
    username: "",
    profileImage: "",
    bio: "",
    location: "",
    university: "",
    socialLinks: {
      email: "",
    },
    firstName: "",
    lastName: "",
    country: "",
    college: "",
    degree: "",
    branch: "",
    graduationYear: "",
    leetcodeUsername: "",
    codeforcesUsername: "",
  });

  const targetUsername = username || user?.username;
  const isOwner =
    Boolean(user?.username) &&
    (!username || username.toLowerCase() === user.username.toLowerCase());

  const fetchAllStats = async (uname, isCurrent = () => true) => {
    setIsStatsLoading(true);
    try {
      const [allStatsRes, leetcode, codeforces] = await Promise.allSettled([
        getAllUserStats(uname),
        getUserLeetCodeStats(uname, { cached: true }),
        getUserCodeForcesStats(uname, { cached: true }),
      ]);

      if (!isCurrent()) return;
      setAllStats(
        allStatsRes.status === "fulfilled"
          ? allStatsRes.value.data.stats
          : null,
      );
      setLeetCodeData(
        leetcode.status === "fulfilled" ? leetcode.value.data.profile : null,
      );
      setCodeforcesData(
        codeforces.status === "fulfilled"
          ? codeforces.value.data.profile
          : null,
      );
    } finally {
      if (isCurrent()) setIsStatsLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await syncAll();
      if (response.data?.failed) toast.error(response.message, { id: syncToastId });
      else toast.success(response.message || "All profiles synced successfully", { id: syncToastId });
      await fetchAllStats(targetUsername);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to sync profiles", { id: syncToastId });
      console.log("Sync all error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchBasicInfo = async (uname, isCurrent) => {
    try {
      const response = await getBasicInfo(uname);

      if (!isCurrent()) return;
      const userObj = response.data.user;
      const names = (userObj.fullname || "").split(" ");

      const leetcodeUsername =
        userObj.connectedPlatforms?.find((item) => item.platform === "leetcode")
          ?.username || "";

      const codeforcesUsername =
        userObj.connectedPlatforms?.find(
          (item) => item.platform === "codeforces",
        )?.username || "";

      const firstName = names[0] || "";
      const lastName = names.slice(1).join(" ");

      setUserData({
        name: `${firstName} ${lastName}`.trim() || userObj.username || "User",
        username: userObj.username || "",
        profileImage: userObj.avatar?.url || "",
        bio: userObj.bio || "",
        location: userObj.country || "Not set",
        university: userObj.education?.institution || "Not set",
        socialLinks: {
          email: userObj.email || "",
        },
        firstName,
        lastName,
        country: userObj.country || "",
        college: userObj.education?.institution || "",
        degree: userObj.education?.degree || "",
        branch: userObj.education?.branch || "",
        graduationYear: userObj.education?.graduationYear || "",
        connectedPlatforms: userObj.connectedPlatforms || [],
        leetcodeUsername,
        codeforcesUsername,
      });
    } catch (error) {
      if (isCurrent()) toast.error(error.response?.data?.message || "Failed to fetch user data");
      console.log("Error while fetching basic info:", error);
    }
  };

  useEffect(() => {
    if (!targetUsername || isAuthLoading) return;
    let current = true;
    const isCurrent = () => current;

    async function loadStats() {
      setIsStatsLoading(true);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const today = new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone }).format(new Date());
      const syncKey = `kompile:profile-auto-sync:${targetUsername.toLowerCase()}`;
      if (isOwner && readAutoSyncDay(syncKey) !== today) {
        setIsSyncing(true);
        try {
          const response = await syncAll({
            onlyIfDue: true,
            timeZone,
          });
          saveAutoSyncDay(syncKey, today);
          if (current && response.data?.failed) toast.error(response.message, { id: syncToastId });
        } catch (error) {
          if (current) toast.error(error.response?.data?.message || "Automatic profile sync failed", { id: syncToastId });
        } finally {
          if (current) setIsSyncing(false);
        }
      }
      if (current) await fetchAllStats(targetUsername, isCurrent);
    }

    fetchBasicInfo(targetUsername, isCurrent);
    loadStats();
    return () => { current = false; };
  }, [targetUsername, isOwner, isAuthLoading]);

  return (
    <div className="w-full pb-6 max-w-[1600px] mx-auto">
      <section className="flex flex-col lg:flex-row justify-between items-start gap-6 min-h-[calc(100vh-120px)]">
        {/* left */}
        <ProfileSidebar
          userData={userData}
          isOwner={isOwner}
        />

        {/* right */}
        {(
          <div className="flex-1 min-w-0 w-full bg-[#141414] rounded-2xl h-full border border-white/[0.08] p-6 text-white flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-4 max-sm:flex-wrap max-sm:gap-2">
              <div>
                <p className="text-2xl">Profile</p>
              </div>
              {isOwner && (
                <div className="flex gap-2 items-center">
                  <button
                    onClick={handleSyncAll}
                    disabled={isSyncing}
                    title="Sync all profiles"
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#2e2e2e] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      size={22}
                      className={`${isSyncing ? "animate-spin text-[#f89f1b]" : "text-zinc-400 hover:text-white"}`}
                    />
                  </button>
                  <div>
                    <NavLink to="/user_data">
                      <UserCog size={24} />
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-1 max-sm:flex-wrap border-b border-[#2e2e2e] mb-6">
              <button
                onClick={() => setActiveTab("userStats")}
                className={`px-5 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                  activeTab === "userStats"
                    ? "border-[#f89f1b] text-[#f89f1b]"
                    : "border-transparent text-[#888] hover:text-white"
                }`}
              >
                All Stats
              </button>
              <button
                onClick={() => setActiveTab("leetcode")}
                className={`px-5 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                  activeTab === "leetcode"
                    ? "border-[#f89f1b] text-[#f89f1b]"
                    : "border-transparent text-[#888] hover:text-white"
                }`}
              >
                LeetCode
              </button>
              <button
                onClick={() => setActiveTab("codeforces")}
                className={`px-5 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                  activeTab === "codeforces"
                    ? "border-[#f89f1b] text-[#f89f1b]"
                    : "border-transparent text-[#888] hover:text-white"
                }`}
              >
                Codeforces
              </button>
            </div>

            <div className="flex-1">
              {isStatsLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#f89f1b]" />
                </div>
              ) : (
                <>
                  {activeTab === "userStats" && (
                    <UserStats
                      isOwner={isOwner}
                      allStats={allStats}
                      noPlatformsLinked={
                        !userData.leetcodeUsername &&
                        !userData.codeforcesUsername
                      }
                    />
                  )}
                  {activeTab === "leetcode" && (
                    <LeetcodeData
                      isOwner={isOwner}
                      LeetcodeData={leetcodeData}
                      userName={userData.leetcodeUsername}
                    />
                  )}
                  {activeTab === "codeforces" && (
                    <CodeforcesData
                      isOwner={isOwner}
                      CodeforcesData={codeforcesData}
                      userName={userData.codeforcesUsername}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Profile;
