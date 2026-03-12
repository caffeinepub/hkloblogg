import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinBlobStorage "blob-storage/Mixin";
import Map "mo:core/Map";

import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";

actor {

  let accessControlState : AccessControl.AccessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinBlobStorage();

  public type AccessLevel = { #Public; #Restricted; #Private };

  type PostInternal = {
    id : Nat;
    title : Text;
    content : Text;
    authorAlias : Text;
    authorPrincipal : Principal;
    categoryId : Nat;
    createdAt : Int;
    status : { #Draft; #Published };
  };

  type PostImages = {
    coverImageKey : ?Text;
    galleryImageKeys : [Text];
  };

  public type Post = {
    id : Nat;
    title : Text;
    content : Text;
    authorAlias : Text;
    authorPrincipal : Principal;
    categoryId : Nat;
    createdAt : Int;
    updatedAt : Int;
    status : { #Draft; #Published };
    coverImageKey : ?Text;
    galleryImageKeys : [Text];
  };

  public type Category = {
    id : Nat;
    name : Text;
    description : Text;
    accessLevel : AccessLevel;
    readerList : [Principal];
    createdBy : Principal;
    createdAt : Int;
    updatedAt : Int;
  };

  public type UserProfile = {
    principalId : Principal;
    alias : Text;
    email : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type ModerationLog = {
    id : Nat;
    action : Text;
    admin : Principal;
    targetUser : ?Principal;
    contentType : Text;
    snippet : Text;
    reason : Text;
    timestamp : Int;
  };

  // ── Fas 5: Notification & Follow types ───────────────────────────────────────

  public type Notification = {
    id : Nat;
    toPrincipal : Principal;
    message : Text;
    link : Text;
    notifType : Text;
    read : Bool;
    timestamp : Int;
  };

  var categories : [Category] = [];
  var nextCategoryId : Nat = 1;
  var posts : [PostInternal] = [];
  var nextPostId : Nat = 1;
  var userProfiles : Map.Map<Principal, UserProfile> = Map.empty<Principal, UserProfile>();
  var moderationLogs : [ModerationLog] = [];
  var nextLogId : Nat = 1;

  var postImages : Map.Map<Nat, PostImages> = Map.empty<Nat, PostImages>();
  var postUpdatedAt : Map.Map<Nat, Int> = Map.empty<Nat, Int>();

  // Fas 3: alias lookup for readers
  var readerAliasMap : Map.Map<Principal, Text> = Map.empty<Principal, Text>();

  // Blocked users
  var blockedUsers : Map.Map<Principal, Bool> = Map.empty<Principal, Bool>();

  // Fas 5: Notifications
  var notifications : [Notification] = [];
  var nextNotifId : Nat = 1;

  // Fas 5: Follows -- array of (follower, followee) pairs
  var follows : [(Principal, Principal)] = [];

  let blockedWords : [Text] = [
    "kuk", "fitta", "hora", "javla", "fan", "skit", "idiot", "knull", "helvete",
    "fuck", "shit", "bitch", "cunt", "bastard", "dick", "pussy", "whore"
  ];

  func checkBlocked(text : Text) : ?Text {
    let lower = text.toLower();
    blockedWords.find(func(w) = lower.contains(#text w));
  };

  func enrichPost(p : PostInternal) : Post {
    let imgs : PostImages = switch (postImages.get(p.id)) {
      case (?i) { i };
      case (null) { { coverImageKey = null; galleryImageKeys = [] } };
    };
    let updatedAt : Int = switch (postUpdatedAt.get(p.id)) {
      case (?t) { t };
      case (null) { p.createdAt };
    };
    {
      id = p.id;
      title = p.title;
      content = p.content;
      authorAlias = p.authorAlias;
      authorPrincipal = p.authorPrincipal;
      categoryId = p.categoryId;
      createdAt = p.createdAt;
      updatedAt;
      status = p.status;
      coverImageKey = imgs.coverImageKey;
      galleryImageKeys = imgs.galleryImageKeys;
    };
  };

  // ── Fas 5: Internal notification helper ──────────────────────────────────────

  func addNotification(toPrincipal : Principal, message : Text, link : Text, notifType : Text) {
    if (toPrincipal.isAnonymous()) { return };
    let id = nextNotifId;
    nextNotifId += 1;
    notifications := notifications.concat([{
      id;
      toPrincipal;
      message;
      link;
      notifType;
      read = false;
      timestamp = Time.now();
    }]);
  };

  // ── Default category seed ─────────────────────────────────────────────────────

  public shared (_) func initDefaultCategories() : async () {
    if (categories.size() > 0) { return };
    let now = Time.now();
    let seedCreator = Principal.fromText("aaaaa-aa");
    let defaults : [(Text, Text, AccessLevel)] = [
      ("Offentligt", "Synlig för alla",          #Public),
      ("Vänner",     "Synlig för vänner",        #Restricted),
      ("Familj",     "Privat för familjen",      #Private),
      ("Arbete",     "Arbetsrelaterade inlägg",  #Restricted),
      ("Teknik",     "Tech och programmering",   #Public),
    ];
    for ((name, description, accessLevel) in defaults.vals()) {
      let id = nextCategoryId;
      nextCategoryId += 1;
      categories := categories.concat([{
        id; name; description; accessLevel;
        readerList = [];
        createdBy = seedCreator;
        createdAt = now;
        updatedAt = now;
      }]);
    };
  };

  // ── Categories ───────────────────────────────────────────────────────────────

  public shared ({ caller }) func createCategory(name : Text, description : Text, accessLevel : AccessLevel) : async Nat {
    let id = nextCategoryId;
    nextCategoryId += 1;
    categories := categories.concat([{
      id; name; description; accessLevel;
      readerList = [caller];
      createdBy = caller;
      createdAt = Time.now();
      updatedAt = Time.now();
    }]);
    id;
  };

  public shared ({ caller }) func updateCategory(id : Nat, name : Text, description : Text, accessLevel : AccessLevel) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    switch (categories.findIndex(func(c : Category) : Bool = c.id == id)) {
      case (null) { false };
      case (?i) {
        let old = categories[i];
        categories := Array.tabulate<Category>(categories.size(), func(j) {
          if (j == i) { { id = old.id; name; description; accessLevel;
            readerList = old.readerList; createdBy = old.createdBy;
            createdAt = old.createdAt; updatedAt = Time.now() } }
          else { categories[j] };
        });
        true;
      };
    };
  };


  public shared ({ caller }) func deleteCategory(id : Nat) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    let sizeBefore = categories.size();
    categories := categories.filter(func(c : Category) : Bool = c.id != id);
    categories.size() < sizeBefore;
  };

  public shared ({ caller }) func addReaderToCategory(categoryId : Nat, reader : Principal) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    switch (categories.findIndex(func(c : Category) : Bool = c.id == categoryId)) {
      case (null) { false };
      case (?i) {
        let old = categories[i];
        if (old.readerList.find(func(p : Principal) : Bool = Principal.equal(p, reader)) != null) { return true };
        categories := Array.tabulate<Category>(categories.size(), func(j) {
          if (j == i) { { id = old.id; name = old.name; description = old.description;
            accessLevel = old.accessLevel;
            readerList = old.readerList.concat([reader]);
            createdBy = old.createdBy; createdAt = old.createdAt; updatedAt = Time.now() } }
          else { categories[j] };
        });
        true;
      };
    };
  };

  // Fas 3: Add reader with alias to a category
  public shared ({ caller }) func addReaderAliasToCategory(categoryId : Nat, readerAlias : Text, reader : Principal) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    switch (categories.findIndex(func(c : Category) : Bool = c.id == categoryId)) {
      case (null) { false };
      case (?i) {
        let old = categories[i];
        if (old.readerList.find(func(p : Principal) : Bool = Principal.equal(p, reader)) == null) {
          categories := Array.tabulate<Category>(categories.size(), func(j) {
            if (j == i) { { id = old.id; name = old.name; description = old.description;
              accessLevel = old.accessLevel;
              readerList = old.readerList.concat([reader]);
              createdBy = old.createdBy; createdAt = old.createdAt; updatedAt = Time.now() } }
            else { categories[j] };
          });
        };
        readerAliasMap.add(reader, readerAlias);
        true;
      };
    };
  };

  // Fas 3: Resolve aliases for a list of principals
  public query func getReaderAliases(principals : [Principal]) : async [(Principal, Text)] {
    var result : [(Principal, Text)] = [];
    for (p in principals.vals()) {
      let alias = switch (readerAliasMap.get(p)) {
        case (?a) { a };
        case (null) {
          switch (userProfiles.get(p)) {
            case (?prof) { prof.alias };
            case (null) { p.toText() };
          };
        };
      };
      result := result.concat([(p, alias)]);
    };
    result;
  };

  public query func getCategories() : async [Category] { categories };

  public query func getCategoryById(id : Nat) : async ?Category {
    categories.find(func(c : Category) : Bool = c.id == id);
  };

  // ── Posts ────────────────────────────────────────────────────────────────────

  public shared ({ caller }) func createPost(title : Text, content : Text, categoryId : Nat) : async { #ok : Nat; #err : Text } {
    if (blockedUsers.get(caller) != null) {
      return #err("Ditt konto är blockerat. Du kan inte skapa inlägg.");
    };
    switch (checkBlocked(title # " " # content)) {
      case (?word) {
        moderationLogs := moderationLogs.concat([{
          id = nextLogId; action = "block"; admin = caller; targetUser = ?caller;
          contentType = "post"; snippet = title;
          reason = "Blocked word: " # word; timestamp = Time.now();
        }]);
        nextLogId += 1;
        return #err("Innehållet innehåller otillåtna ord.");
      };
      case (null) {};
    };
    let alias = switch (userProfiles.get(caller)) {
      case (?p) { p.alias };
      case (null) { "Anonym" };
    };
    let now = Time.now();
    let id = nextPostId;
    nextPostId += 1;
    posts := posts.concat([{
      id; title; content; authorAlias = alias; authorPrincipal = caller;
      categoryId; createdAt = now; status = #Draft;
    }]);
    postUpdatedAt.add(id, now);
    postImages.add(id, { coverImageKey = null; galleryImageKeys = [] });
    #ok id;
  };

  public shared ({ caller }) func updatePost(postId : Nat, title : Text, content : Text, categoryId : Nat) : async { #ok : Bool; #err : Text } {
    if (blockedUsers.get(caller) != null and not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Ditt konto är blockerat.");
    };
    switch (checkBlocked(title # " " # content)) {
      case (?_word) { return #err("Innehållet innehåller otillåtna ord.") };
      case (null) {};
    };
    switch (posts.findIndex(func(p : PostInternal) : Bool = p.id == postId)) {
      case (null) { #err("Inlägget hittades inte.") };
      case (?i) {
        let old = posts[i];
        if (not Principal.equal(old.authorPrincipal, caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          return #err("Inte behörig.");
        };
        let now = Time.now();
        posts := Array.tabulate<PostInternal>(posts.size(), func(j) {
          if (j == i) { { id = old.id; title; content; authorAlias = old.authorAlias;
            authorPrincipal = old.authorPrincipal; categoryId; createdAt = old.createdAt;
            status = old.status } }
          else { posts[j] };
        });
        postUpdatedAt.add(postId, now);
        #ok true;
      };
    };
  };

  public shared ({ caller }) func updatePostImages(postId : Nat, coverImageKey : ?Text, galleryImageKeys : [Text]) : async Bool {
    switch (posts.find(func(p : PostInternal) : Bool = p.id == postId)) {
      case (null) { false };
      case (?p) {
        if (not Principal.equal(p.authorPrincipal, caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          return false;
        };
        postImages.add(postId, { coverImageKey; galleryImageKeys });
        true;
      };
    };
  };

  public shared ({ caller }) func deletePost(postId : Nat) : async Bool {
    switch (posts.find(func(p : PostInternal) : Bool = p.id == postId)) {
      case (null) { false };
      case (?p) {
        if (not Principal.equal(p.authorPrincipal, caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          return false;
        };
        posts := posts.filter(func(q : PostInternal) : Bool = q.id != postId);
        postImages.remove(postId);
        postUpdatedAt.remove(postId);
        true;
      };
    };
  };

  public shared ({ caller }) func publishPost(postId : Nat) : async Bool {
    switch (posts.findIndex(func(p : PostInternal) : Bool = p.id == postId)) {
      case (null) { false };
      case (?i) {
        let old = posts[i];
        if (not Principal.equal(old.authorPrincipal, caller) and not AccessControl.isAdmin(accessControlState, caller)) { return false };
        posts := Array.tabulate<PostInternal>(posts.size(), func(j) {
          if (j == i) { { id = old.id; title = old.title; content = old.content;
            authorAlias = old.authorAlias; authorPrincipal = old.authorPrincipal;
            categoryId = old.categoryId; createdAt = old.createdAt; status = #Published } }
          else { posts[j] };
        });
        postUpdatedAt.add(postId, Time.now());
        // Fas 5: Notify all followers of the author
        let author = old.authorPrincipal;
        let authorAlias = old.authorAlias;
        let postLink = "/post/" # postId.toText();
        for ((follower, followee) in follows.vals()) {
          if (Principal.equal(followee, author)) {
            addNotification(
              follower,
              authorAlias # " publicerade ett nytt inlägg: " # old.title,
              postLink,
              "new_post"
            );
          };
        };
        true;
      };
    };
  };

  public query func getPublishedPosts() : async [Post] {
    posts
      .filter(func(p : PostInternal) : Bool = p.status == #Published)
      .map(enrichPost);
  };

  public query func getPostById(id : Nat) : async ?Post {
    switch (posts.find(func(p : PostInternal) : Bool = p.id == id)) {
      case (null) { null };
      case (?p) { ?enrichPost(p) };
    };
  };

  public query ({ caller }) func getPostsByAuthor() : async [Post] {
    posts
      .filter(func(p : PostInternal) : Bool = Principal.equal(p.authorPrincipal, caller))
      .map(enrichPost);
  };

  public query func getPostsByPrincipal(principalId : Principal) : async [Post] {
    posts
      .filter(func(p : PostInternal) : Bool = Principal.equal(p.authorPrincipal, principalId) and p.status == #Published)
      .map(enrichPost);
  };

  public query ({ caller }) func getPostsForUser() : async [Post] {
    posts.filter(func(p : PostInternal) : Bool {
      if (p.status != #Published) { return false };
      switch (categories.find(func(c : Category) : Bool = c.id == p.categoryId)) {
        case (null) { false };
        case (?cat) {
          switch (cat.accessLevel) {
            case (#Public) { true };
            case (#Restricted) { cat.readerList.find(func(r : Principal) : Bool = Principal.equal(r, caller)) != null };
            case (#Private) { AccessControl.isAdmin(accessControlState, caller) };
          };
        };
      };
    }).map(enrichPost);
  };

  // Fas 3: Only public posts (no login needed for Discover page)
  public query func getDiscoverPosts() : async [Post] {
    posts.filter(func(p : PostInternal) : Bool {
      if (p.status != #Published) { return false };
      switch (categories.find(func(c : Category) : Bool = c.id == p.categoryId)) {
        case (null) { false };
        case (?cat) { cat.accessLevel == #Public };
      };
    }).map(enrichPost);
  };

  // Fas 3: Search posts by text with access control
  public query ({ caller }) func searchPosts(queryText : Text) : async [Post] {
    let q = queryText.toLower();
    posts.filter(func(p : PostInternal) : Bool {
      if (p.status != #Published) { return false };
      switch (categories.find(func(c : Category) : Bool = c.id == p.categoryId)) {
        case (null) { false };
        case (?cat) {
          let hasAccess = switch (cat.accessLevel) {
            case (#Public) { true };
            case (#Restricted) { cat.readerList.find(func(r : Principal) : Bool = Principal.equal(r, caller)) != null };
            case (#Private) { AccessControl.isAdmin(accessControlState, caller) };
          };
          if (not hasAccess) { return false };
          let titleMatch = p.title.toLower().contains(#text q);
          let contentMatch = p.content.toLower().contains(#text q);
          let categoryMatch = cat.name.toLower().contains(#text q);
          let aliasMatch = p.authorAlias.toLower().contains(#text q);
          titleMatch or contentMatch or categoryMatch or aliasMatch;
        };
      };
    }).map(enrichPost);
  };

  // ── User profiles ─────────────────────────────────────────────────────────────

  public query func getUserProfile(principalId : Principal) : async ?UserProfile {
    userProfiles.get(principalId);
  };

  public shared ({ caller }) func setAlias(alias : Text) : async Bool {
    if (caller.isAnonymous()) { return false };
    let now = Time.now();
    let profile : UserProfile = switch (userProfiles.get(caller)) {
      case (?p) { { principalId = p.principalId; alias; email = p.email; createdAt = p.createdAt; updatedAt = now } };
      case (null) { { principalId = caller; alias; email = null; createdAt = now; updatedAt = now } };
    };
    userProfiles.add(caller, profile);
    true;
  };

  public shared ({ caller }) func updateUserAliasAdmin(targetPrincipal : Principal, newAlias : Text) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    let now = Time.now();
    let profile : UserProfile = switch (userProfiles.get(targetPrincipal)) {
      case (?p) { { principalId = p.principalId; alias = newAlias; email = p.email; createdAt = p.createdAt; updatedAt = now } };
      case (null) { { principalId = targetPrincipal; alias = newAlias; email = null; createdAt = now; updatedAt = now } };
    };
    userProfiles.add(targetPrincipal, profile);
    moderationLogs := moderationLogs.concat([{
      id = nextLogId; action = "alias_update"; admin = caller; targetUser = ?targetPrincipal;
      contentType = "user"; snippet = newAlias; reason = "Admin alias update"; timestamp = now;
    }]);
    nextLogId += 1;
    true;
  };

  public query ({ caller }) func getAllUsers() : async [UserProfile] {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return [] };
    var result : [UserProfile] = [];
    for ((_, profile) in userProfiles.entries()) {
      result := result.concat([profile]);
    };
    result;
  };

  public query ({ caller }) func getModerationLogs() : async [ModerationLog] {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return [] };
    moderationLogs;
  };

  public query func containsBlockedContent(text : Text) : async ?Text {
    checkBlocked(text);
  };

  // ── User blocking ──────────────────────────────────────────────────────────────

  public shared ({ caller }) func blockUser(target : Principal) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    if (AccessControl.isAdmin(accessControlState, target)) { return false }; // can't block admins
    blockedUsers.add(target, true);
    let alias = switch (userProfiles.get(target)) {
      case (?p) { p.alias };
      case (null) { target.toText() };
    };
    moderationLogs := moderationLogs.concat([{
      id = nextLogId; action = "block_user"; admin = caller; targetUser = ?target;
      contentType = "user"; snippet = alias; reason = "Admin block"; timestamp = Time.now();
    }]);
    nextLogId += 1;
    true;
  };

  public shared ({ caller }) func unblockUser(target : Principal) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    blockedUsers.remove(target);
    let alias = switch (userProfiles.get(target)) {
      case (?p) { p.alias };
      case (null) { target.toText() };
    };
    moderationLogs := moderationLogs.concat([{
      id = nextLogId; action = "unblock_user"; admin = caller; targetUser = ?target;
      contentType = "user"; snippet = alias; reason = "Admin unblock"; timestamp = Time.now();
    }]);
    nextLogId += 1;
    true;
  };

  public query ({ caller }) func getBlockedUsers() : async [Principal] {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return [] };
    var result : [Principal] = [];
    for ((p, _) in blockedUsers.entries()) {
      result := result.concat([p]);
    };
    result;
  };

  public query func isUserBlocked(user : Principal) : async Bool {
    blockedUsers.get(user) != null;
  };

  // ── Fas 5: Notifications ───────────────────────────────────────────────────────

  public shared ({ caller }) func sendNotification(toPrincipal : Principal, message : Text, link : Text, notifType : Text) : async Bool {
    addNotification(toPrincipal, message, link, notifType);
    true;
  };

  public query ({ caller }) func getUnreadNotifications() : async [Notification] {
    notifications.filter(func(n : Notification) : Bool =
      Principal.equal(n.toPrincipal, caller) and not n.read
    );
  };

  public query ({ caller }) func getAllNotifications() : async [Notification] {
    notifications.filter(func(n : Notification) : Bool =
      Principal.equal(n.toPrincipal, caller)
    );
  };

  public shared ({ caller }) func markNotificationsRead() : async Bool {
    notifications := notifications.map(func(n : Notification) : Notification {
      if (Principal.equal(n.toPrincipal, caller)) {
        { id = n.id; toPrincipal = n.toPrincipal; message = n.message;
          link = n.link; notifType = n.notifType; read = true; timestamp = n.timestamp }
      } else { n };
    });
    true;
  };

  // ── Fas 5: Follow system ───────────────────────────────────────────────────────

  public shared ({ caller }) func followUser(followeePrincipal : Principal) : async Bool {
    if (caller.isAnonymous()) { return false };
    if (Principal.equal(caller, followeePrincipal)) { return false };
    // Check if already following
    let alreadyFollowing = follows.find(func((f, fe) : (Principal, Principal)) : Bool =
      Principal.equal(f, caller) and Principal.equal(fe, followeePrincipal)
    ) != null;
    if (alreadyFollowing) { return true };
    follows := follows.concat([(caller, followeePrincipal)]);
    // Send notification to followee
    let followerAlias = switch (userProfiles.get(caller)) {
      case (?p) { p.alias };
      case (null) { caller.toText() };
    };
    addNotification(
      followeePrincipal,
      followerAlias # " började följa dig!",
      "/profile/" # caller.toText(),
      "follow"
    );
    true;
  };

  public shared ({ caller }) func unfollowUser(followeePrincipal : Principal) : async Bool {
    if (caller.isAnonymous()) { return false };
    follows := follows.filter(func((f, fe) : (Principal, Principal)) : Bool =
      not (Principal.equal(f, caller) and Principal.equal(fe, followeePrincipal))
    );
    true;
  };

  public query func getFollowers(principalId : Principal) : async [Principal] {
    var result : [Principal] = [];
    for ((follower, followee) in follows.vals()) {
      if (Principal.equal(followee, principalId)) {
        result := result.concat([follower]);
      };
    };
    result;
  };

  public query func getFollowing(principalId : Principal) : async [Principal] {
    var result : [Principal] = [];
    for ((follower, followee) in follows.vals()) {
      if (Principal.equal(follower, principalId)) {
        result := result.concat([followee]);
      };
    };
    result;
  };

  public query ({ caller }) func isFollowing(followeePrincipal : Principal) : async Bool {
    follows.find(func((f, fe) : (Principal, Principal)) : Bool =
      Principal.equal(f, caller) and Principal.equal(fe, followeePrincipal)
    ) != null;
  };
};
