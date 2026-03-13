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

  // Fas 6: Reaction type
  public type Reaction = {
    userPrincipal : Principal;
    emoji : Text;
    createdAt : Int;
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
    reactions : [Reaction];
    viewCount : Nat;
    language : Text;
  };

  // Fas 6: Comment type
  public type Comment = {
    id : Nat;
    postId : Nat;
    authorPrincipal : Principal;
    authorAlias : Text;
    content : Text;
    imageKeys : [Text];
    createdAt : Int;
    reactions : [Reaction];
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

  // Fas 5: Notification & Follow types
  public type Notification = {
    id : Nat;
    toPrincipal : Principal;
    message : Text;
    link : Text;
    notifType : Text;
    read : Bool;
    timestamp : Int;
  };

  // ── Stable state (survives upgrades/deploys) ──────────────────────────────

  // Simple arrays and counters -- stable directly
  stable var categories : [Category] = [];
  stable var nextCategoryId : Nat = 1;
  stable var posts : [PostInternal] = [];
  stable var nextPostId : Nat = 1;
  stable var moderationLogs : [ModerationLog] = [];
  stable var nextLogId : Nat = 1;
  stable var notifications : [Notification] = [];
  stable var nextNotifId : Nat = 1;
  stable var follows : [(Principal, Principal)] = [];
  stable var comments : [Comment] = [];
  stable var nextCommentId : Nat = 1;

  // Stable backup arrays for Maps (Maps themselves are not stable)
  stable var stableUserProfiles : [(Principal, UserProfile)] = [];
  stable var stablePostImages : [(Nat, PostImages)] = [];
  stable var stablePostUpdatedAt : [(Nat, Int)] = [];
  stable var stableReaderAliasMap : [(Principal, Text)] = [];
  stable var stableBlockedUsers : [(Principal, Bool)] = [];
  stable var stablePostReactions : [(Nat, [Reaction])] = [];
  stable var stablePostViewCounts : [(Nat, Nat)] = [];
  stable var stablePostLanguages : [(Nat, Text)] = [];

  // Runtime Maps (reconstructed from stable backups on upgrade)
  var userProfiles : Map.Map<Principal, UserProfile> = Map.empty<Principal, UserProfile>();
  var postImages : Map.Map<Nat, PostImages> = Map.empty<Nat, PostImages>();
  var postUpdatedAt : Map.Map<Nat, Int> = Map.empty<Nat, Int>();
  var readerAliasMap : Map.Map<Principal, Text> = Map.empty<Principal, Text>();
  var blockedUsers : Map.Map<Principal, Bool> = Map.empty<Principal, Bool>();
  var postReactions : Map.Map<Nat, [Reaction]> = Map.empty<Nat, [Reaction]>();
  var postViewCounts : Map.Map<Nat, Nat> = Map.empty<Nat, Nat>();
  var postLanguages : Map.Map<Nat, Text> = Map.empty<Nat, Text>();

  // ── Upgrade hooks ─────────────────────────────────────────────────────────

  system func preupgrade() {
    var up : [(Principal, UserProfile)] = [];
    for (entry in userProfiles.entries()) { up := up.concat([entry]) };
    stableUserProfiles := up;

    var ip : [(Nat, PostImages)] = [];
    for (entry in postImages.entries()) { ip := ip.concat([entry]) };
    stablePostImages := ip;

    var ua : [(Nat, Int)] = [];
    for (entry in postUpdatedAt.entries()) { ua := ua.concat([entry]) };
    stablePostUpdatedAt := ua;

    var ra : [(Principal, Text)] = [];
    for (entry in readerAliasMap.entries()) { ra := ra.concat([entry]) };
    stableReaderAliasMap := ra;

    var bu : [(Principal, Bool)] = [];
    for (entry in blockedUsers.entries()) { bu := bu.concat([entry]) };
    stableBlockedUsers := bu;

    var pr : [(Nat, [Reaction])] = [];
    for (entry in postReactions.entries()) { pr := pr.concat([entry]) };
    stablePostReactions := pr;
    var vc : [(Nat, Nat)] = [];
    for (entry in postViewCounts.entries()) { vc := vc.concat([entry]) };
    stablePostViewCounts := vc;

    var pl : [(Nat, Text)] = [];
    for (entry in postLanguages.entries()) { pl := pl.concat([entry]) };
    stablePostLanguages := pl;
  };

  system func postupgrade() {
    for ((k, v) in stableUserProfiles.vals()) { userProfiles.add(k, v) };
    for ((k, v) in stablePostImages.vals()) { postImages.add(k, v) };
    for ((k, v) in stablePostUpdatedAt.vals()) { postUpdatedAt.add(k, v) };
    for ((k, v) in stableReaderAliasMap.vals()) { readerAliasMap.add(k, v) };
    for ((k, v) in stableBlockedUsers.vals()) { blockedUsers.add(k, v) };
    for ((k, v) in stablePostReactions.vals()) { postReactions.add(k, v) };
    for ((k, v) in stablePostViewCounts.vals()) { postViewCounts.add(k, v) };
    for ((k, v) in stablePostLanguages.vals()) { postLanguages.add(k, v) };
  };

  // ─────────────────────────────────────────────────────────────────────────

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
    let reactions : [Reaction] = switch (postReactions.get(p.id)) {
      case (?r) { r };
      case (null) { [] };
    };
    let viewCount : Nat = switch (postViewCounts.get(p.id)) {
      case (?v) { v };
      case (null) { 0 };
    };
    let language : Text = switch (postLanguages.get(p.id)) {
      case (?l) { l };
      case (null) { "sv" };
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
      reactions;
      viewCount;
      language;
    };
  };

  // Fas 5: Internal notification helper
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

  // Default category seed
  public shared (_) func initDefaultCategories() : async () {
    if (categories.size() > 0) { return };
    let now = Time.now();
    let seedCreator = Principal.fromText("aaaaa-aa");
    let defaults : [(Text, Text, AccessLevel)] = [
      ("Offentligt", "Synlig f\u{f6}r alla",          #Public),
      ("V\u{e4}nner",     "Synlig f\u{f6}r v\u{e4}nner",        #Restricted),
      ("Familj",     "Privat f\u{f6}r familjen",      #Private),
      ("Arbete",     "Arbetsrelaterade inl\u{e4}gg",  #Restricted),
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

  // Categories
  // Non-admin users can create categories but access level is forced to Restricted.
  // Only superadmin can create Public or Private categories.
  public shared ({ caller }) func createCategory(name : Text, description : Text, accessLevel : AccessLevel) : async Nat {
    if (caller.isAnonymous()) { return 0 };
    // Force Restricted for non-admins
    let effectiveLevel : AccessLevel = if (AccessControl.isAdmin(accessControlState, caller)) {
      accessLevel
    } else {
      #Restricted
    };
    let id = nextCategoryId;
    nextCategoryId += 1;
    categories := categories.concat([{
      id; name; description; accessLevel = effectiveLevel;
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

  // Posts
  public shared ({ caller }) func createPost(title : Text, content : Text, categoryId : Nat, language : Text) : async { #ok : Nat; #err : Text } {
    if (blockedUsers.get(caller) != null) {
      return #err("Ditt konto \u{e4}r blockerat. Du kan inte skapa inl\u{e4}gg.");
    };
    switch (checkBlocked(title # " " # content)) {
      case (?word) {
        moderationLogs := moderationLogs.concat([{
          id = nextLogId; action = "block"; admin = caller; targetUser = ?caller;
          contentType = "post"; snippet = title;
          reason = "Blocked word: " # word; timestamp = Time.now();
        }]);
        nextLogId += 1;
        return #err("Inneh\u{e5}llet inneh\u{e5}ller otill\u{e5}tna ord.");
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
    postLanguages.add(id, language);
    #ok id;
  };

  public shared ({ caller }) func updatePost(postId : Nat, title : Text, content : Text, categoryId : Nat, language : Text) : async { #ok : Bool; #err : Text } {
    if (blockedUsers.get(caller) != null and not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Ditt konto \u{e4}r blockerat.");
    };
    switch (checkBlocked(title # " " # content)) {
      case (?_word) { return #err("Inneh\u{e5}llet inneh\u{e5}ller otill\u{e5}tna ord.") };
      case (null) {};
    };
    switch (posts.findIndex(func(p : PostInternal) : Bool = p.id == postId)) {
      case (null) { #err("Inl\u{e4}gget hittades inte.") };
      case (?i) {
        let old = posts[i];
        if (not Principal.equal(old.authorPrincipal, caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          return #err("Inte beh\u{f6}rig.");
        };
        let now = Time.now();
        posts := Array.tabulate<PostInternal>(posts.size(), func(j) {
          if (j == i) { { id = old.id; title; content; authorAlias = old.authorAlias;
            authorPrincipal = old.authorPrincipal; categoryId; createdAt = old.createdAt;
            status = old.status } }
          else { posts[j] };
        });
        postUpdatedAt.add(postId, now);
        postLanguages.add(postId, language);
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
        postReactions.remove(postId);
        // Remove comments for this post
        comments := comments.filter(func(c : Comment) : Bool = c.postId != postId);
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
        let author = old.authorPrincipal;
        let authorAlias = old.authorAlias;
        let postLink = "/post/" # postId.toText();
        for ((follower, followee) in follows.vals()) {
          if (Principal.equal(followee, author)) {
            addNotification(
              follower,
              authorAlias # " publicerade ett nytt inl\u{e4}gg: " # old.title,
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
  public shared func incrementPostView(postId : Nat) : async () {
    let current : Nat = switch (postViewCounts.get(postId)) {
      case (?v) { v };
      case (null) { 0 };
    };
    postViewCounts.add(postId, current + 1);
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

  public query func getDiscoverPosts() : async [Post] {
    posts.filter(func(p : PostInternal) : Bool {
      if (p.status != #Published) { return false };
      switch (categories.find(func(c : Category) : Bool = c.id == p.categoryId)) {
        case (null) { false };
        case (?cat) { cat.accessLevel == #Public };
      };
    }).map(enrichPost);
  };

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

  // User profiles
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

  // User blocking
  public shared ({ caller }) func blockUser(target : Principal) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) { return false };
    if (AccessControl.isAdmin(accessControlState, target)) { return false };
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

  public query ({ caller }) func checkIsAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // Fas 5: Notifications
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

  // Fas 5: Follow system
  public shared ({ caller }) func followUser(followeePrincipal : Principal) : async Bool {
    if (caller.isAnonymous()) { return false };
    if (Principal.equal(caller, followeePrincipal)) { return false };
    let alreadyFollowing = follows.find(func((f, fe) : (Principal, Principal)) : Bool =
      Principal.equal(f, caller) and Principal.equal(fe, followeePrincipal)
    ) != null;
    if (alreadyFollowing) { return true };
    follows := follows.concat([(caller, followeePrincipal)]);
    let followerAlias = switch (userProfiles.get(caller)) {
      case (?p) { p.alias };
      case (null) { caller.toText() };
    };
    addNotification(
      followeePrincipal,
      followerAlias # " b\u{f6}rjade f\u{f6}lja dig!",
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
  public query func getFollowerCount(principalId : Principal) : async Nat {
    var count : Nat = 0;
    for ((_, followee) in follows.vals()) {
      if (Principal.equal(followee, principalId)) { count += 1 };
    };
    count;
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

  // ── Fas 6: Reactions ──────────────────────────────────────────────────────────

  public shared ({ caller }) func addReactionToPost(postId : Nat, emoji : Text) : async Bool {
    if (caller.isAnonymous()) { return false };
    if (blockedUsers.get(caller) != null) { return false };
    let existing : [Reaction] = switch (postReactions.get(postId)) {
      case (?r) { r };
      case (null) { [] };
    };
    // Check duplicate
    let alreadyReacted = existing.find(func(r : Reaction) : Bool =
      Principal.equal(r.userPrincipal, caller) and r.emoji == emoji
    ) != null;
    if (alreadyReacted) { return false };
    postReactions.add(postId, existing.concat([{
      userPrincipal = caller;
      emoji;
      createdAt = Time.now();
    }]));
    true;
  };

  public shared ({ caller }) func removeReactionFromPost(postId : Nat, emoji : Text) : async Bool {
    if (caller.isAnonymous()) { return false };
    let existing : [Reaction] = switch (postReactions.get(postId)) {
      case (?r) { r };
      case (null) { return false };
    };
    postReactions.add(postId, existing.filter(func(r : Reaction) : Bool =
      not (Principal.equal(r.userPrincipal, caller) and r.emoji == emoji)
    ));
    true;
  };

  public query func getPostReactions(postId : Nat) : async [Reaction] {
    switch (postReactions.get(postId)) {
      case (?r) { r };
      case (null) { [] };
    };
  };

  // ── Fas 6: Comments ───────────────────────────────────────────────────────────

  public shared ({ caller }) func addComment(postId : Nat, content : Text, imageKeys : [Text]) : async { #ok : Comment; #err : Text } {
    if (caller.isAnonymous()) { return #err("Du m\u{e5}ste vara inloggad f\u{f6}r att kommentera.") };
    if (blockedUsers.get(caller) != null) { return #err("Ditt konto \u{e4}r blockerat.") };
    switch (checkBlocked(content)) {
      case (?word) {
        moderationLogs := moderationLogs.concat([{
          id = nextLogId; action = "block"; admin = caller; targetUser = ?caller;
          contentType = "comment"; snippet = content;
          reason = "Blocked word: " # word; timestamp = Time.now();
        }]);
        nextLogId += 1;
        return #err("Kommentaren inneh\u{e5}ller otill\u{e5}tna ord.");
      };
      case (null) {};
    };
    let authorAlias = switch (userProfiles.get(caller)) {
      case (?p) { p.alias };
      case (null) { "Anonym" };
    };
    let id = nextCommentId;
    nextCommentId += 1;
    let comment : Comment = {
      id; postId;
      authorPrincipal = caller;
      authorAlias;
      content;
      imageKeys;
      createdAt = Time.now();
      reactions = [];
    };
    comments := comments.concat([comment]);
    #ok comment;
  };

  public query func getComments(postId : Nat) : async [Comment] {
    comments.filter(func(c : Comment) : Bool = c.postId == postId);
  };

};
