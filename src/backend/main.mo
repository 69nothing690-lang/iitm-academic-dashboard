import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Array "mo:core/Array";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
  };

  type AcademicData = Text;

  public type Holiday = { date : Text; name : Text };
  public type SlotExamDate = { slot : Text; quiz1 : Text; quiz2 : Text; endSem : Text };
  public type SemesterConfig = {
    id : Text;
    name : Text;
    year : Nat;
    semType : Text;
    classStart : Text;
    classEnd : Text;
    quiz1Start : Text;
    quiz1End : Text;
    quiz2Start : Text;
    quiz2End : Text;
    endSemStart : Text;
    endSemEnd : Text;
    holidays : [Holiday];
    events : [Holiday];
    slotExamDates : [SlotExamDate];
    isActive : Bool;
  };

  let records = Map.empty<Principal, AcademicData>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let semesterConfigs = Map.empty<Text, SemesterConfig>();

  // Required user profile functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Academic data functions
  public query ({ caller }) func getCallerSnapshot() : async ?AcademicData {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access academic data");
    };
    records.get(caller);
  };

  public shared ({ caller }) func saveCallerSnapshot(snapshot : AcademicData) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save academic data");
    };
    records.add(caller, snapshot);
  };

  // Semester configuration functions
  public shared ({ caller }) func saveSemesterConfig(config : SemesterConfig) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can save semester configurations");
    };
    semesterConfigs.add(config.id, config);
  };

  public shared ({ caller }) func deleteSemesterConfig(id : Text) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete semester configurations");
    };
    semesterConfigs.remove(id);
  };

  public shared ({ caller }) func setActiveSemester(id : Text) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can set active semester");
    };

    // First, set all semesters to inactive
    for ((configId, config) in semesterConfigs.entries()) {
      let updatedConfig = {
        id = config.id;
        name = config.name;
        year = config.year;
        semType = config.semType;
        classStart = config.classStart;
        classEnd = config.classEnd;
        quiz1Start = config.quiz1Start;
        quiz1End = config.quiz1End;
        quiz2Start = config.quiz2Start;
        quiz2End = config.quiz2End;
        endSemStart = config.endSemStart;
        endSemEnd = config.endSemEnd;
        holidays = config.holidays;
        events = config.events;
        slotExamDates = config.slotExamDates;
        isActive = false;
      };
      semesterConfigs.add(configId, updatedConfig);
    };

    // Then, set the specified semester to active
    switch (semesterConfigs.get(id)) {
      case (?config) {
        let activeConfig = {
          id = config.id;
          name = config.name;
          year = config.year;
          semType = config.semType;
          classStart = config.classStart;
          classEnd = config.classEnd;
          quiz1Start = config.quiz1Start;
          quiz1End = config.quiz1End;
          quiz2Start = config.quiz2Start;
          quiz2End = config.quiz2End;
          endSemStart = config.endSemStart;
          endSemEnd = config.endSemEnd;
          holidays = config.holidays;
          events = config.events;
          slotExamDates = config.slotExamDates;
          isActive = true;
        };
        semesterConfigs.add(id, activeConfig);
      };
      case null {
        Runtime.trap("Semester configuration not found");
      };
    };
  };

  public query func getActiveSemesterConfig() : async ?SemesterConfig {
    // Public function - no authorization required
    for ((_, config) in semesterConfigs.entries()) {
      if (config.isActive) {
        return ?config;
      };
    };
    null;
  };

  public query ({ caller }) func listSemesterConfigs() : async [SemesterConfig] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can list all semester configurations");
    };

    let configArray = Array.tabulate(
      semesterConfigs.size(),
      func(i : Nat) : SemesterConfig {
        var index = 0;
        for ((_, config) in semesterConfigs.entries()) {
          if (index == i) {
            return config;
          };
          index += 1;
        };
        Runtime.trap("Index out of bounds");
      },
    );
    configArray;
  };
};
