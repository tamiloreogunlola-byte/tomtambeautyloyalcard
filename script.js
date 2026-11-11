const STORAGE_KEY = 'tomtam_members';
const CURRENT_USER_KEY = 'tomtam_current_user';
const APP_URL = 'https://tomtambeautystore.netlify.app';

function generateReferralCode(username) {
  const base = (username || 'member')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 7)
    .toUpperCase() || 'TT';

  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `TT-${base}-${randomPart}`;
}

function getMembers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveMembers(members) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function slugify(value) {
  return (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function buildReferralLink(code) {
  return `${APP_URL}/?ref=${encodeURIComponent(code)}`;
}

function getDefaultReferrals() {
  return [];
}

function addReferralFromLink(user) {
  const params = new URLSearchParams(window.location.search);
  const referredCode = params.get('ref');
  if (!referredCode) return user;

  const normalized = referredCode.trim();
  if (!normalized) return user;

  const referrals = Array.isArray(user.referrals) ? [...user.referrals] : [];
  const exists = referrals.some((item) => (item.code || '').toLowerCase() === normalized.toLowerCase());

  if (!exists) {
    referrals.unshift({
      name: 'Someone clicked your link',
      code: normalized,
      purchased: false,
      status: 'Waiting purchase'
    });
  }

  user.referrals = referrals;
  return user;
}

function getMemberByIdentifier(identifier) {
  const members = getMembers();
  const value = (identifier || '').trim().toLowerCase();
  return members.find((member) => {
    const usernameMatch = (member.username || '').toLowerCase() === value;
    const emailMatch = (member.email || '').toLowerCase() === value;
    return usernameMatch || emailMatch;
  });
}

function updateStampCards(stampCount) {
  const containers = document.querySelectorAll('.profile-stamps, .mini-stamps, .stamp-strip, .card-showcase .count');

  containers.forEach((container) => {
    const slots = Array.from(container.querySelectorAll('span'));
    slots.forEach((slot, index) => {
      slot.classList.toggle('filled', index < stampCount);
    });
  });
}

function updateDashboard() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'signin.html';
    return;
  }

  const updatedUser = addReferralFromLink({ ...user, referrals: Array.isArray(user.referrals) ? user.referrals : getDefaultReferrals() });
  setCurrentUser(updatedUser);

  const members = getMembers();
  const memberIndex = members.findIndex((member) => member.email === updatedUser.email || member.username === updatedUser.username);
  if (memberIndex >= 0) {
    members[memberIndex] = updatedUser;
    saveMembers(members);
  }

  const welcome = document.getElementById('welcomeMessage');
  if (welcome) {
    const displayName = updatedUser.username || updatedUser.firstName || 'Member';
    welcome.textContent = `Welcome back, ${displayName}`;
  }

  const referralInput = document.getElementById('referralLink');
  if (referralInput) {
    referralInput.value = updatedUser.referralLink || buildReferralLink(updatedUser.referralCode || updatedUser.username || 'member');
  }

  const referralCodeDisplay = document.getElementById('referralCodeValue');
  if (referralCodeDisplay) {
    referralCodeDisplay.textContent = updatedUser.referralCode || 'TT-USER-0000';
  }

  const inviteList = document.getElementById('inviteList');
  if (inviteList) {
    inviteList.innerHTML = '';
    const referralEntries = Array.isArray(updatedUser.referrals) ? updatedUser.referrals : [];

    if (!referralEntries.length) {
      const empty = document.createElement('div');
      empty.className = 'invite-row';
      empty.innerHTML = '<div><div class="invite-name">No referrals yet</div><div class="invite-status">Your referral activity will appear here after someone uses your code.</div></div>';
      inviteList.appendChild(empty);
    } else {
      referralEntries.forEach((invite, index) => {
        const row = document.createElement('div');
        row.className = 'invite-row';

        const info = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'invite-name';
        name.textContent = invite.name || 'Referral';

        const status = document.createElement('div');
        status.className = 'invite-status';
        status.textContent = invite.status || (invite.purchased ? 'Confirmed' : 'Waiting purchase');

        info.appendChild(name);
        info.appendChild(status);

        const actions = document.createElement('div');
        actions.className = 'invite-actions';

        if (invite.purchased === true || invite.status === 'Confirmed' || invite.status === 'Purchase confirmed') {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'mini-btn green';
          button.textContent = 'Reward added';
          button.disabled = true;
          actions.appendChild(button);
        } else {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'mini-btn green';
          button.textContent = 'Confirm purchase';
          button.addEventListener('click', () => {
            const currentMembers = getMembers();
            const currentUserData = getCurrentUser();
            const memberPosition = currentMembers.findIndex((member) => member.email === currentUserData.email || member.username === currentUserData.username);

            updatedUser.referrals[index].status = 'Confirmed';
            updatedUser.referrals[index].purchased = true;
            updatedUser.confirmedReferrals = Number(updatedUser.confirmedReferrals || 0) + 1;
            updatedUser.stamps = Number(updatedUser.stamps || 0) + 1;
            setCurrentUser(updatedUser);

            if (memberPosition >= 0) {
              currentMembers[memberPosition] = updatedUser;
              saveMembers(currentMembers);
            }

            updateDashboard();
          });
          actions.appendChild(button);
        }

        row.appendChild(info);
        row.appendChild(actions);
        inviteList.appendChild(row);
      });
    }
  }

  const stampCount = Number(updatedUser.stamps || 0);
  const stampSummary = document.getElementById('stampSummary');
  const refSummary = document.getElementById('refSummary');
  const statusSummary = document.getElementById('statusSummary');

  updateStampCards(stampCount);

  if (stampSummary) stampSummary.textContent = String(stampCount);
  if (refSummary) refSummary.textContent = String(updatedUser.confirmedReferrals || 0);
  if (statusSummary) statusSummary.textContent = stampCount >= 5 ? 'Claim prize' : 'Open';

  if (stampCount >= 5 && !updatedUser.rewardClaimOpened) {
    updatedUser.rewardClaimOpened = true;
    setCurrentUser(updatedUser);

    const membersAgain = getMembers();
    const memberPositionAgain = membersAgain.findIndex((member) => member.email === updatedUser.email || member.username === updatedUser.username);
    if (memberPositionAgain >= 0) {
      membersAgain[memberPositionAgain] = updatedUser;
      saveMembers(membersAgain);
    }

    const claimLink = 'https://wa.me/2349052649316?text=Hi%20TomTam%20Beauty%20Store%2C%20I%20want%20to%20claim%20my%205%20referral%20reward.';
    window.open(claimLink, '_blank', 'noopener');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.toggle-password').forEach((button) => {
    button.addEventListener('click', () => {
      const input = button.previousElementSibling;
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      button.textContent = isPassword ? 'Hide' : 'Show';
      button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  });

  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const copyButton = document.getElementById('copyButton');

  if (signInForm) {
    signInForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const loginValue = document.getElementById('username')?.value.trim() || document.getElementById('email')?.value.trim();
      const password = document.getElementById('password')?.value.trim();

      if (!loginValue || !password) {
        alert('Please fill in all sign in details.');
        return;
      }

      const member = getMemberByIdentifier(loginValue);
      if (!member) {
        alert('No account found for that username or email. Please create an account before signing in.');
        window.location.href = 'signup.html';
        return;
      }

      if (member.password !== password) {
        alert('Incorrect password.');
        return;
      }

      setCurrentUser(member);
      window.location.href = 'dashboard.html';
    });
  }

  if (signUpForm) {
    signUpForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const firstName = document.getElementById('firstName')?.value.trim();
      const lastName = document.getElementById('lastName')?.value.trim();
      const username = document.getElementById('username')?.value.trim();
      const email = document.getElementById('email')?.value.trim();
      const phone = document.getElementById('phone')?.value.trim();
      const password = document.getElementById('password')?.value.trim();
      const referralCodeInput = document.getElementById('referralCode')?.value.trim();

      if (!firstName || !lastName || !username || !email || !phone || !password) {
        alert('Please fill in all account details.');
        return;
      }

      const members = getMembers();
      const usernameExists = members.some((member) => (member.username || '').toLowerCase() === username.toLowerCase());
      if (usernameExists) {
        alert('That username is already taken. Please choose another one.');
        return;
      }

      const referralCodeMatch = referralCodeInput
        ? members.find((member) => (member.referralCode || '').toUpperCase() === referralCodeInput.toUpperCase())
        : null;

      if (referralCodeInput && !referralCodeMatch) {
        alert('That referral code is not valid. Please check it or leave this field empty.');
        return;
      }

      const code = generateReferralCode(username);
      const member = {
        firstName,
        lastName,
        username,
        email,
        phone,
        password,
        stamps: 0,
        confirmedReferrals: 0,
        referralCode: code,
        referrals: getDefaultReferrals(),
        referralLink: buildReferralLink(code),
        referredBy: referralCodeMatch ? referralCodeMatch.referralCode : ''
      };

      if (referralCodeMatch) {
        const referrerIndex = members.findIndex((memberItem) => (memberItem.referralCode || '').toUpperCase() === referralCodeInput.toUpperCase());
        if (referrerIndex >= 0) {
          const existingReferrals = Array.isArray(members[referrerIndex].referrals) ? [...members[referrerIndex].referrals] : [];
          const alreadyLinked = existingReferrals.some((item) => (item.name || '').toLowerCase() === username.toLowerCase());

          if (!alreadyLinked) {
            existingReferrals.unshift({
              name: username,
              code: referralCodeInput,
              purchased: false,
              status: 'Waiting purchase'
            });
            members[referrerIndex].referrals = existingReferrals;
          }
        }
      }

      members.push(member);
      saveMembers(members);

      alert('Account created successfully. Please sign in.');
      window.location.href = 'signin.html';
    });
  }

  if (copyButton) {
    copyButton.addEventListener('click', function () {
      const input = document.getElementById('referralLink');
      if (!input) return;
      input.select();
      document.execCommand('copy');
      const previous = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = previous;
      }, 1200);
    });
  }

  if (document.body.dataset.page === 'dashboard') {
    updateDashboard();
  }

  if (document.body.dataset.page === 'home') {
    const currentUser = getCurrentUser();
    const homeName = document.getElementById('homeUserName');
    const homeBadge = document.getElementById('homeUserBadge');
    if (currentUser && homeName && homeBadge) {
      homeName.textContent = currentUser.username || currentUser.firstName || 'member';
      homeBadge.style.display = 'inline-block';
    }
  }
});
