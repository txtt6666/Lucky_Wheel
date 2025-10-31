let gameData = {
    rewards: [],
    punishments: [],
    history: [],
    stats: {
        totalDraws: 0,
        todayDraws: 0,
        lastDrawDate: null,
        lastDrawTime: 0, // 最后抽奖时间戳
        offsetCards: 0, // 抵消卡数量
        player1: {
            draws: 0,
            rewards: 0,
            punishments: 0
        },
        player2: {
            draws: 0,
            rewards: 0,
            punishments: 0
        }
    },
    players: {
        player1: {
            name: '玩家1',
            avatar: './player1.svg' // 默认头像路径
        },
        player2: {
            name: '玩家2',
            avatar: './player2.svg' // 默认头像路径
        }
    },
    settings: {
        cooldownTime: 60, // 冷却时间(秒)
        theme: 'default', // 默认主题
        // 新增：背景音乐设置
        bgMusic: {
            enabled: false,
            volume: 50,
            src: null,
            useDefault: true // 新增：是否使用默认音乐
        },
        // 新增：抽奖音乐设置
        spinMusic: {
            enabled: false,
            volume: 50,
            src: null,
            useDefault: true // 新增：是否使用默认音效
        }
    },
    currentPlayer: 'player1',
    coopModeData: {
        isActive: false,
        firstResult: null
    },
    // 新增：模板库数据
    templates: {
        sweetInteraction: [], // 甜蜜互动
        lifeBlessing: [], // 生活小确幸
        funChallenge: [], // 趣味挑战
        romanticMoment: [], // 浪漫瞬间
        intimateGame: [],  // 情趣游戏
        coopMode: []       // 新增：合作模式
    },
    // 新增：自定义背景
    customBackground: null,
    // 新增：当前使用的模板信息
    currentTemplate: null,
    // 新增：未完成事项数据
    pendingItems: {
        player1: {
            rewards: [],
            punishments: []
        },
        player2: {
            rewards: [],
            punishments: []
        }
    },
    // 新增：玩家抵消卡数量
    playerOffsetCards: {
        player1: 0,
        player2: 0
    }
};

let editingItem = null;
let editingType = null;
let currentResult = null;
let currentRotation = 0;
let isSpinning = false;
let cooldownTimer = null;
let themeInterval = null;
let templateEditing = null;

// 新增：存储合作模式的两个结果
let coopResults = {
    player1: null,
    player2: null
};

// 新增：合作模式选择状态
let coopSelections = {
    player1: null, // 'complete' 或 'skip'
    player2: null  // 'complete' 或 'skip'
};

// 新增：音频对象
let bgAudio = null;
let spinAudio = null;

// 新增：默认音频路径
const DEFAULT_BG_MUSIC = './background.mp3';
const DEFAULT_SPIN_SOUND = './lottery.mp3';

// 新增：音频状态
let audioState = {
    bgMusicPlaying: false,
    spinMusicPlaying: false,
    userInteracted: false, // 标记用户是否已与页面交互
    bgAudioReady: false, // 新增：背景音乐就绪状态
    spinAudioReady: false // 新增：抽奖音乐就绪状态
};

window.onload = function () {
    loadData();
    initDefaultData();
    initDefaultTemplates();
    resizeCanvas();
    drawWheel();
    updateStats();
    updatePlayerDisplay();
    createHearts();
    checkCooldown();
    applyTheme(gameData.settings.theme);
    loadCustomBackground();
    renderTemplateLists();

    // 新增：初始化音频设置
    initAudioSettings();

    // 新增：添加用户交互监听，解决Chrome自动播放限制
    document.addEventListener('click', handleFirstUserInteraction);
    document.addEventListener('touchstart', handleFirstUserInteraction);

    window.addEventListener('resize', debounce(handleResize, 100));

    // 添加调试按钮（开发时使用）
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = '🔇 停止所有音频';
        debugBtn.style.position = 'fixed';
        debugBtn.style.bottom = '10px';
        debugBtn.style.right = '10px';
        debugBtn.style.zIndex = '10000';
        debugBtn.style.padding = '10px';
        debugBtn.style.background = '#ff6b9d';
        debugBtn.style.color = 'white';
        debugBtn.style.border = 'none';
        debugBtn.style.borderRadius = '5px';
        debugBtn.style.cursor = 'pointer';
        debugBtn.onclick = stopAllAudio;
        document.body.appendChild(debugBtn);
    }
};

// 新增：处理首次用户交互
function handleFirstUserInteraction() {
    if (!audioState.userInteracted) {
        audioState.userInteracted = true;
        console.log('用户已交互，可以播放音频');

        // 移除事件监听
        document.removeEventListener('click', handleFirstUserInteraction);
        document.removeEventListener('touchstart', handleFirstUserInteraction);

        // 延迟播放背景音乐，确保音频加载完成
        setTimeout(() => {
            if (gameData.settings.bgMusic.enabled) {
                playBgMusic();
            }
        }, 1000);
    }
}

function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function handleResize() {
    resizeCanvas();
    drawWheel();
}

function resizeCanvas() {
    const container = document.querySelector('.wheel-container');
    const containerRect = container.getBoundingClientRect();
    const size = Math.min(containerRect.width, containerRect.height);
    const canvas = document.getElementById('wheelCanvas');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
}

// 创建粒子效果
function createParticle(x, y, color) {
    const container = document.querySelector('.particles-container');
    const particle = document.createElement('div');
    particle.className = 'particle';

    // 随机大小和位置
    const size = Math.random() * 8 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.backgroundColor = color || (Math.random() > 0.5 ? '#ffd700' : '#ff6b9d');

    container.appendChild(particle);

    // 粒子动画
    const duration = Math.random() * 1500 + 500;
    const start = Date.now();

    function animate() {
        const elapsed = Date.now() - start;
        if (elapsed < duration) {
            const progress = elapsed / duration;
            const opacity = 1 - progress;
            const offsetX = (Math.random() - 0.5) * 100 * progress;
            const offsetY = (Math.random() - 0.5) * 100 * progress;

            particle.style.opacity = opacity;
            particle.style.transform = `translate(${offsetX}px, ${-offsetY}px)`;
            requestAnimationFrame(animate);
        } else {
            particle.remove();
        }
    }

    animate();
}

// 转盘旋转时的粒子效果
function createSpinParticles() {
    const canvas = document.getElementById('wheelCanvas');
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    // 持续创建粒子
    const particleInterval = setInterval(() => {
        if (!isSpinning) {
            clearInterval(particleInterval);
            return;
        }

        // 在转盘边缘随机位置创建粒子
        const angle = Math.random() * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius * 0.8;
        const y = centerY + Math.sin(angle) * radius * 0.8;

        // 根据位置选择颜色
        const color = Math.cos(angle) > 0 ? '#ffd700' : '#ff6b9d';
        createParticle(x, y, color);
    }, 50);
}

function createHearts() {
    // 清除之前的定时器
    if (themeInterval) clearInterval(themeInterval);

    const container = document.querySelector('.hearts-container');
    container.innerHTML = ''; // 清空现有元素

    // 根据主题创建不同的飘落元素
    if (gameData.settings.theme === 'valentine') {
        // 情人节 - 玫瑰花瓣
        const petals = ['🌹', '🌸', '💐', '💮'];
        themeInterval = setInterval(() => {
            const petal = document.createElement('div');
            petal.className = 'rose-petal';
            petal.textContent = petals[Math.floor(Math.random() * petals.length)];
            petal.style.left = Math.random() * 100 + '%';
            petal.style.animationDuration = (Math.random() * 3 + 5) + 's';
            container.appendChild(petal);

            setTimeout(() => petal.remove(), 10000);
        }, 1500);
    } else if (gameData.settings.theme === 'christmas') {
        // 圣诞节 - 雪花
        const snowflakes = ['❄️', '❅', '❆', '☃️'];
        themeInterval = setInterval(() => {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
            snowflake.style.left = Math.random() * 100 + '%';
            snowflake.style.animationDuration = (Math.random() * 3 + 5) + 's';
            container.appendChild(snowflake);

            setTimeout(() => snowflake.remove(), 10000);
        }, 1500);
    } else if (gameData.settings.theme === 'spring') {
        // 春季 - 花瓣
        const petals = ['🌼', '🌻', '🌱', '🌿'];
        themeInterval = setInterval(() => {
            const petal = document.createElement('div');
            petal.className = 'spring-petal';
            petal.textContent = petals[Math.floor(Math.random() * petals.length)];
            petal.style.left = Math.random() * 100 + '%';
            petal.style.animationDuration = (Math.random() * 3 + 5) + 's';
            container.appendChild(petal);

            setTimeout(() => petal.remove(), 10000);
        }, 1500);
    } else if (gameData.settings.theme === 'cartoon') {
        // 卡通风 - 卡通元素
        const cartoonItems = ['🐰', '🐱', '🐶', '🐼', '🐯', '🦊', '🐸', '🐨'];
        themeInterval = setInterval(() => {
            const item = document.createElement('div');
            item.className = 'cartoon-item';
            item.textContent = cartoonItems[Math.floor(Math.random() * cartoonItems.length)];
            item.style.left = Math.random() * 100 + '%';
            item.style.animationDuration = (Math.random() * 3 + 6) + 's';
            container.appendChild(item);

            setTimeout(() => item.remove(), 10000);
        }, 1200);
    } else if (gameData.settings.theme === 'minimalist') {
        // 简约风 - 圆点
        themeInterval = setInterval(() => {
            const dot = document.createElement('div');
            dot.className = 'minimalist-dot';
            dot.style.left = Math.random() * 100 + '%';
            dot.style.animationDuration = (Math.random() * 3 + 9) + 's';
            container.appendChild(dot);

            setTimeout(() => dot.remove(), 12000);
        }, 1000);
    } else if (gameData.settings.theme === 'vintage') {
        // 复古风 - 复古元素
        const vintageItems = ['📜', '🕰️', '📻', '☎️', '📽️', '🕯️', '✒️', '📚'];
        themeInterval = setInterval(() => {
            const item = document.createElement('div');
            item.className = 'vintage-item';
            item.textContent = vintageItems[Math.floor(Math.random() * vintageItems.length)];
            item.style.left = Math.random() * 100 + '%';
            item.style.animationDuration = (Math.random() * 3 + 7) + 's';
            container.appendChild(item);

            setTimeout(() => item.remove(), 11000);
        }, 1300);
    } else {
        // 默认主题 - 心形
        const hearts = ['💕', '💖', '💗', '💓', '💝', '❤️', '🧡', '💛'];
        themeInterval = setInterval(() => {
            const heart = document.createElement('div');
            heart.className = 'heart';
            heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            heart.style.left = Math.random() * 100 + '%';
            heart.style.animationDuration = (Math.random() * 3 + 5) + 's';
            container.appendChild(heart);

            setTimeout(() => heart.remove(), 10000);
        }, 2000);
    }
}

// 应用主题
function applyTheme(theme) {
    const body = document.body;

    // 移除所有主题类
    body.classList.remove('theme-valentine', 'theme-christmas', 'theme-spring', 'theme-cartoon', 'theme-minimalist', 'theme-vintage');

    // 添加当前主题类
    if (theme === 'valentine') {
        body.classList.add('theme-valentine');
    } else if (theme === 'christmas') {
        body.classList.add('theme-christmas');
    } else if (theme === 'spring') {
        body.classList.add('theme-spring');
    } else if (theme === 'cartoon') {
        body.classList.add('theme-cartoon');
    } else if (theme === 'minimalist') {
        body.classList.add('theme-minimalist');
    } else if (theme === 'vintage') {
        body.classList.add('theme-vintage');
    }

    // 重新创建飘落元素
    createHearts();
}

// 初始化默认数据
function initDefaultData() {
    if (gameData.rewards.length === 0 && gameData.punishments.length === 0) {
        // 🎁 奖励库
        const defaultRewards = [
            { title: '国王敕令', desc: '可以下达一个简单指令，对方需立即执行', probability: 7, icon: '👑' },
            { title: '专属按摩师', desc: '享受对方2分钟的肩颈或手部按摩', probability: 6, icon: '💆‍♂️' },
            { title: '免罪金牌', desc: '免除一次小过错，不可累积', probability: 5, icon: '🏅' },
            { title: '彩虹屁时间', desc: '对方用1分钟不间断地夸赞你', probability: 8, icon: '🌈' },
            { title: '零食优先权', desc: '今晚的零食/水果由你先挑', probability: 9, icon: '🍿' },
            { title: '拥抱充电', desc: '获得一个长达1分钟的紧紧拥抱', probability: 10, icon: '🤗' },
            { title: '明日早餐券', desc: '明天早餐由对方负责准备或购买', probability: 4, icon: '🍳' },
            { title: '灵魂点歌台', desc: '点一首歌，对方需播放并跟着哼唱', probability: 7, icon: '🎵' },
            { title: '手写情书', desc: '对方在2分钟内给你写一张小情书', probability: 5, icon: '💌' },
            { title: '模仿小达人', desc: '指定人物让对方模仿经典台词或动作', probability: 6, icon: '🎭' },
            { title: '今晚你决定', desc: '今晚看什么电影/剧集由你全权决定', probability: 7, icon: '🎬' },
            { title: '深情对视', desc: '两人深情对视1分钟，不许笑场', probability: 5, icon: '👀' },
            { title: '朋友圈赞美', desc: '对方在你最新朋友圈下花式赞美评论', probability: 6, icon: '📱' },
            { title: '暖脚服务', desc: '对方用手帮你暖脚1分钟', probability: 5, icon: '🦶' },
            { title: '未来预言家', desc: '预言一件今晚会发生的小事', probability: 4, icon: '🔮' },
            { title: '专属昵称', desc: '今天对方必须用你指定的昵称呼叫你', probability: 8, icon: '😘' },
            { title: '快问快答', desc: '向对方连续提出10个问题并要求快速回答', probability: 9, icon: '❓' },
            { title: '回忆放映厅', desc: '指定甜蜜回忆让对方生动复述', probability: 6, icon: '🎞️' },
            { title: '家务援助', desc: '指定一件小家务让对方立即完成', probability: 5, icon: '🧹' },
            { title: '表情包三连发', desc: '对方根据你情绪发3个精准表情包', probability: 8, icon: '😂' },
            { title: '今日MVP', desc: '获得口头嘉奖和飞吻', probability: 10, icon: '⭐' },
            { title: '反向服务', desc: '你刚做的事对方要反向为你做一遍', probability: 5, icon: '🔄' },
            { title: '秘密暗号', desc: '设定一个今天内有效的秘密暗号', probability: 4, icon: '🤫' },
            { title: '五分钟自由', desc: '获得5分钟不被打扰的独处时间', probability: 6, icon: '⏳' },
            { title: '歌单主导权', desc: '接下来1小时的背景音乐由你决定', probability: 7, icon: '🎧' },
            { title: '趣味合照', desc: '立即拍一张指定主题的合照', probability: 9, icon: '📸' },
            { title: '真心话快问', desc: '问一个真心话问题对方必须诚实回答', probability: 7, icon: '💬' },
            { title: '空气礼物', desc: '对方比划"礼物"你要猜是什么', probability: 8, icon: '🎁' },
            { title: '温度调节师', desc: '空调/风扇的温度风力由你掌控一次', probability: 6, icon: '❄️' },
            { title: '终极夸夸', desc: '对方用特定句式夸你三句', probability: 5, icon: '✨' }
        ];

        // 😈 惩罚库
        const defaultPunishments = [
            // 搞怪类
            { title: '表情包模仿', desc: '抽取对方表情包并进行模仿', probability: 7, icon: '🙈' },
            { title: '土味情话', desc: '对对方说一句土到掉渣的情话', probability: 8, icon: '🌹' },
            { title: '俯卧撑惩罚', desc: '做5个俯卧撑或深蹲', probability: 6, icon: '🏋️' },
            { title: '真心话大冒险', desc: '接受一个对方提出的真心话提问', probability: 9, icon: '🎲' },
            { title: '笨蛋美人', desc: '接下来一分钟每句话都要以特定句子结尾', probability: 5, icon: '🤪' },
            { title: '灵魂画手', desc: '用非惯用手画对方肖像并签名', probability: 6, icon: '🎨' },
            { title: '撒娇八连', desc: '用撒娇语气说特定台词', probability: 7, icon: '🥺' },
            { title: '丑照备案', desc: '允许对方拍一张丑照保留24小时', probability: 4, icon: '📷' },
            { title: '人体拱门', desc: '充当人体拱门让对方从身下钻过', probability: 5, icon: '🚪' },
            { title: '角色扮演', desc: '扮演指定角色对话1分钟', probability: 4, icon: '🎭' },
            { title: '冷笑话时间', desc: '讲一个冷笑话，对方没笑惩罚加倍', probability: 8, icon: '❄️' },
            { title: '微信状态更新', desc: '将微信状态更新为指定内容保持1小时', probability: 6, icon: '📱' },
            { title: '学动物叫', desc: '模仿指定动物的叫声并带动作', probability: 9, icon: '🐶' },
            { title: '对不起之歌', desc: '唱一首歌词全换成对不起的歌', probability: 3, icon: '🎤' },
            { title: '壁咚反省', desc: '被对方壁咚30秒并聆听教诲', probability: 5, icon: '👊' },
            { title: '人力闹钟', desc: '明天用温柔方式叫对方起床', probability: 5, icon: '⏰' },
            { title: '赞美循环', desc: '不间断赞美对方1分钟不能重复', probability: 6, icon: '🔊' },
            { title: '怪味亲吻', desc: '吃怪味食物后亲对方一下', probability: 3, icon: '💋' },
            { title: '服务延期', desc: '将本次抽到的奖励无条件转让给对方', probability: 5, icon: '➡️' },
            { title: '债务清偿', desc: '欠对方一个奖励下次直接兑现', probability: 4, icon: '🏦' }
        ];

        gameData.rewards = defaultRewards;
        gameData.punishments = defaultPunishments;
        saveData();
    }
}

// 初始化默认模板
function initDefaultTemplates() {
    // 检查是否已有模板数据，如果没有则初始化默认模板
    let hasTemplates = false;
    for (const category in gameData.templates) {
        if (gameData.templates[category].length > 0) {
            hasTemplates = true;
            break;
        }
    }

    if (!hasTemplates) {
        // 甜蜜互动模板
        gameData.templates.sweetInteraction = [
            {
                name: "酒桌小游戏",
                rewards: [
                    { title: '真心话大冒险', desc: '让对方选择真心话或大冒险，让对方回答问题或完成挑战', probability: 3, icon: '🎲' },
                    { title: '猜拳赢家特权', desc: '猜拳获胜可转移喝酒惩罚', probability: 2, icon: '✊' },
                    { title: 'SVIP免酒卡', desc: '可以免除此次喝酒惩罚，多少都可以', probability: 1, icon: 'SVIP' },
                    { title: 'VIP免酒卡', desc: '可以免除此次喝酒惩罚，但是对方下一局同样可以免除', probability: 2, icon: 'VIP' },
                    { title: '超级免酒卡', desc: '可以免除1杯（100点）喝酒惩罚', probability: 2, icon: '🔯' },
                    { title: '高级级免酒卡', desc: '可以免除半杯（50点）喝酒惩罚', probability: 3, icon: '🔯' },
                    { title: '中级免酒卡', desc: '可以免除2/5杯（20点）喝酒惩罚', probability: 4, icon: '🔯' },
                    { title: '初级免酒卡', desc: '可以免除1/5杯（10点）喝酒惩罚', probability: 5, icon: '🔯' },
                    { title: '超级强制喝酒卡', desc: '免除本次喝酒惩罚，然后喝一口（5点）', probability: 1, icon: '🍷' },
                    { title: '高级强制喝酒卡', desc: '免除本次喝酒惩罚，然后喝1/5（10点）', probability: 2, icon: '🍷' },
                    { title: '中级强制喝酒卡', desc: '免除本次喝酒惩罚，然后喝2/5（20点）', probability: 3, icon: '🍷' },
                    { title: '初级强制喝酒卡', desc: '免除本次喝酒惩罚，然后喝半杯（50点）', probability: 4, icon: '🍷' },
                    { title: '小姐卡（对方）', desc: '让对方陪你喝同样的酒量', probability: 2, icon: '🍷' },
                    { title: '分酒卡', desc: '让对方陪你一起分掉喝酒惩罚的酒量', probability: 4, icon: '🍻' },
                    { title: '减半卡', desc: '免除一半喝酒惩罚的酒量', probability: 3, icon: '🥃' },
                    { title: '转移卡', desc: '将你的喝酒惩罚转移给对方', probability: 1, icon: '🎭' },
                    { title: '富豪卡（自己）', desc: '你可以靠转账要求你多喝多少酒（0.1元=10点，封顶200点），但是不能免除你本次的喝酒惩罚', probability: 5, icon: '💎' }
                ],
                punishments: [
                    { title: '超级加倍卡', desc: '现在的喝酒惩罚×2倍', probability: 1, icon: '🍷' },
                    { title: '抽卡喝酒惩罚', desc: '抽一张扑克牌，从A~K分别代表1~13，免除本次喝酒惩罚后喝抽到牌的数字×10点的酒', probability: 3, icon: '🍷' },
                    { title: '高级加倍卡', desc: '1.5倍现在的喝酒惩罚', probability: 2, icon: '🍷' },
                    { title: '加倍卡', desc: '1.2倍现在的喝酒惩罚', probability: 4, icon: '🍷' },
                    { title: '再来两杯', desc: '现在的喝酒惩罚+2杯（200点）', probability: 1, icon: '🍷' },
                    { title: '再来一杯', desc: '现在的喝酒惩罚+1杯（100点）', probability: 2, icon: '🍷' },
                    { title: '再来半杯', desc: '现在的喝酒惩罚+0.5杯（50点）', probability: 3, icon: '🍷' },
                    { title: '再来一口', desc: '现在的喝酒惩罚+0.2杯（20点）', probability: 4, icon: '🍷' },
                    { title: '再抿一口', desc: '现在的喝酒惩罚+0.1（10点）', probability: 5, icon: '🍷' },
                    { title: '恶魔强制喝酒卡', desc: '免除本次喝酒惩罚，然后喝一杯（100点）', probability: 2, icon: '👹' },
                    { title: '地狱强制喝酒卡', desc: '免除本次喝酒惩罚，然后喝两杯（200点）', probability: 1, icon: '👺' },
                    { title: '真心话时间', desc: '必须如实回答对方一个问题', probability: 5, icon: '💬' },
                    { title: '大冒险时间', desc: '必须完成对方的一个任务（不能太过分，太过分的话可以拒绝）', probability: 5, icon: '🙀' },
                    { title: '猜拳输家惩罚', desc: '猜拳失败需喝两倍的喝酒惩罚，猜拳成功则可以减免一半', probability: 4, icon: '✊' },
                    { title: '小丑卡', desc: '扭着屁股完成你的喝酒惩罚', probability: 4, icon: '🤡' },
                    { title: '富豪卡（对方）', desc: '对方可以靠转账要求你多喝多少酒（0.1元=10点，封顶200点）', probability: 5, icon: '💎' },
                    { title: '小姐卡（自己）', desc: '你需要在下一局陪对方喝同样的酒量', probability: 2, icon: '🍷' }
                ]
            },
            {
                name: "日常甜蜜",
                rewards: [
                    { title: '国王敕令', desc: '可以下达一个简单指令，对方需立即执行', probability: 7, icon: '👑' },
                    { title: '专属按摩师', desc: '享受对方2分钟的肩颈或手部按摩', probability: 6, icon: '💆‍♂️' },
                    { title: '免罪金牌', desc: '免除一次小过错，不可累积', probability: 5, icon: '🏅' },
                    { title: '彩虹屁时间', desc: '对方用1分钟不间断地夸赞你', probability: 8, icon: '🌈' },
                    { title: '零食优先权', desc: '今晚的零食/水果由你先挑', probability: 9, icon: '🍿' },
                    { title: '拥抱充电', desc: '获得一个长达1分钟的紧紧拥抱', probability: 10, icon: '🤗' },
                    { title: '明日早餐券', desc: '明天早餐由对方负责准备或购买', probability: 4, icon: '🍳' },
                    { title: '灵魂点歌台', desc: '点一首歌，对方需播放并跟着哼唱', probability: 7, icon: '🎵' },
                    { title: '手写情书', desc: '对方在2分钟内给你写一张小情书', probability: 5, icon: '💌' },
                    { title: '模仿小达人', desc: '指定人物让对方模仿经典台词或动作', probability: 6, icon: '🎭' },
                    { title: '今晚你决定', desc: '今晚看什么电影/剧集由你全权决定', probability: 7, icon: '🎬' },
                    { title: '深情对视', desc: '两人深情对视1分钟，不许笑场', probability: 5, icon: '👀' },
                    { title: '朋友圈赞美', desc: '对方在你最新朋友圈下花式赞美评论', probability: 6, icon: '📱' },
                    { title: '暖脚服务', desc: '对方用手帮你暖脚1分钟', probability: 5, icon: '🦶' },
                    { title: '未来预言家', desc: '预言一件今晚会发生的小事', probability: 4, icon: '🔮' },
                    { title: '专属昵称', desc: '今天对方必须用你指定的昵称呼叫你', probability: 8, icon: '😘' },
                    { title: '快问快答', desc: '向对方连续提出10个问题并要求快速回答', probability: 9, icon: '❓' },
                    { title: '回忆放映厅', desc: '指定甜蜜回忆让对方生动复述', probability: 6, icon: '🎞️' },
                    { title: '家务援助', desc: '指定一件小家务让对方立即完成', probability: 5, icon: '🧹' },
                    { title: '表情包三连发', desc: '对方根据你情绪发3个精准表情包', probability: 8, icon: '😂' },
                    { title: '今日MVP', desc: '获得口头嘉奖和飞吻', probability: 10, icon: '⭐' },
                    { title: '反向服务', desc: '你刚做的事对方要反向为你做一遍', probability: 5, icon: '🔄' },
                    { title: '秘密暗号', desc: '设定一个今天内有效的秘密暗号', probability: 4, icon: '🤫' },
                    { title: '五分钟自由', desc: '获得5分钟不被打扰的独处时间', probability: 6, icon: '⏳' },
                    { title: '歌单主导权', desc: '接下来1小时的背景音乐由你决定', probability: 7, icon: '🎧' },
                    { title: '趣味合照', desc: '立即拍一张指定主题的合照', probability: 9, icon: '📸' },
                    { title: '真心话快问', desc: '问一个真心话问题对方必须诚实回答', probability: 7, icon: '💬' },
                    { title: '空气礼物', desc: '对方比划"礼物"你要猜是什么', probability: 8, icon: '🎁' },
                    { title: '温度调节师', desc: '空调/风扇的温度风力由你掌控一次', probability: 6, icon: '❄️' },
                    { title: '终极夸夸', desc: '对方用特定句式夸你三句', probability: 5, icon: '✨' }
                ],
                punishments: [
                    { title: '表情包模仿', desc: '抽取对方表情包并进行模仿', probability: 7, icon: '🙈' },
                    { title: '土味情话', desc: '对对方说一句土到掉渣的情话', probability: 8, icon: '🌹' },
                    { title: '俯卧撑惩罚', desc: '做5个俯卧撑或深蹲', probability: 6, icon: '🏋️' },
                    { title: '真心话大冒险', desc: '接受一个对方提出的真心话提问', probability: 9, icon: '🎲' },
                    { title: '笨蛋美人', desc: '接下来一分钟每句话都要以特定句子结尾', probability: 5, icon: '🤪' },
                    { title: '灵魂画手', desc: '用非惯用手画对方肖像并签名', probability: 6, icon: '🎨' },
                    { title: '撒娇八连', desc: '用撒娇语气说特定台词', probability: 7, icon: '🥺' },
                    { title: '丑照备案', desc: '允许对方拍一张丑照保留24小时', probability: 4, icon: '📷' },
                    { title: '人体拱门', desc: '充当人体拱门让对方从身下钻过', probability: 5, icon: '🚪' },
                    { title: '角色扮演', desc: '扮演指定角色对话1分钟', probability: 4, icon: '🎭' },
                    { title: '冷笑话时间', desc: '讲一个冷笑话，对方没笑惩罚加倍', probability: 8, icon: '❄️' },
                    { title: '微信状态更新', desc: '将微信状态更新为指定内容保持1小时', probability: 6, icon: '📱' },
                    { title: '学动物叫', desc: '模仿指定动物的叫声并带动作', probability: 9, icon: '🐶' },
                    { title: '对不起之歌', desc: '唱一首歌词全换成对不起的歌', probability: 3, icon: '🎤' },
                    { title: '壁咚反省', desc: '被对方壁咚30秒并聆听教诲', probability: 5, icon: '👊' },
                    { title: '人力闹钟', desc: '明天用温柔方式叫对方起床', probability: 5, icon: '⏰' },
                    { title: '赞美循环', desc: '不间断赞美对方1分钟不能重复', probability: 6, icon: '🔊' },
                    { title: '怪味亲吻', desc: '吃怪味食物后亲对方一下', probability: 3, icon: '💋' },
                    { title: '服务延期', desc: '将本次抽到的奖励无条件转让给对方', probability: 5, icon: '➡️' },
                    { title: '债务清偿', desc: '欠对方一个奖励下次直接兑现', probability: 4, icon: '🏦' }
                ]
            }
        ];

        // 生活小确幸模板
        gameData.templates.lifeBlessing = [
            {
                name: "家务挑战",
                rewards: [
                    { title: '洗碗豁免卡', desc: '今晚的洗碗任务完全免除', probability: 3, icon: '🍽️' },
                    { title: '洗衣转让权', desc: '将本周自己的一次洗衣任务转让给对方', probability: 4, icon: '👕' },
                    { title: '双人拖地', desc: '对方必须和你一起完成客厅拖地任务', probability: 6, icon: '🧹' },
                    { title: '快速叠衣奖', desc: '2分钟内叠好10件衣服可获得休息30分钟', probability: 7, icon: '👚' },
                    { title: '明日免扫地', desc: '明天不用参与扫地工作', probability: 5, icon: '🧻' },
                    { title: '任务兑换权', desc: '用擦桌子任务兑换洗碗任务', probability: 4, icon: '🔄' },
                    { title: '清洁顺序权', desc: '优先选择今天先做洗碗还是先拖地', probability: 6, icon: '📋' },
                    { title: '洗碗监督员', desc: '监督对方洗碗并指导摆放位置', probability: 5, icon: '👀' },
                    { title: '扫地减半', desc: '今天只需清扫客厅，卧室明天再扫', probability: 4, icon: '⏰' },
                    { title: '厨房验收官', desc: '对对方清洁的厨房进行严格检查', probability: 5, icon: '✅' },
                    { title: '大扫除分期', desc: '卫生间清洁可以分成两天完成', probability: 5, icon: '🚽' },
                    { title: '倒垃圾代劳', desc: '请对方代劳今晚的倒垃圾任务', probability: 6, icon: '🗑️' },
                    { title: '床铺免检', desc: '今天铺的床免于平整度检查', probability: 7, icon: '🛏️' },
                    { title: '吸尘器优先', desc: '优先使用新买的吸尘器打扫', probability: 8, icon: '🌀' },
                    { title: '清洁BGM权', desc: '打扫时可以播放自己喜欢的音乐', probability: 9, icon: '🎵' },
                    { title: '分段休息权', desc: '每清洁一个房间可休息5分钟', probability: 6, icon: '☕' },
                    { title: '厨房零食奖', desc: '清洁厨房时享受对方准备的饮料点心', probability: 8, icon: '🍪' },
                    { title: '擦窗按摩奖', desc: '完成擦窗任务后获得肩部按摩3分钟', probability: 5, icon: '💆' },
                    { title: '洗衣暂停权', desc: '洗衣过程中可以暂停休息15分钟', probability: 6, icon: '⏸️' },
                    { title: '清洁双倍分', desc: '本次卫生间清洁可获得双倍评分', probability: 4, icon: '🚿' },
                    { title: '除尘技巧秀', desc: '展示独特的家具除尘技巧', probability: 5, icon: '✨' },
                    { title: '调换清洁序', desc: '把擦玻璃调到扫地之前进行', probability: 7, icon: '🔀' },
                    { title: '地板标准权', desc: '要求对方拖地时必须拖三遍', probability: 5, icon: '💦' },
                    { title: '新抹布特权', desc: '优先使用新买的超细纤维抹布', probability: 6, icon: '🧽' },
                    { title: '空调调控权', desc: '清洁时可以调节空调到舒适温度', probability: 7, icon: '❄️' },
                    { title: '计时挑战权', desc: '记录对方整理衣柜所用时间', probability: 6, icon: '⏱️' },
                    { title: '创新清洁法', desc: '尝试用蒸汽清洁厨房油污', probability: 5, icon: '💨' },
                    { title: '协作擦窗奖', desc: '与对方一起擦窗可减少10分钟工时', probability: 6, icon: '🪟' },
                    { title: '快速整理奖', desc: '5分钟内整理好沙发可获得奖励', probability: 5, icon: '🛋️' },
                    { title: '除垢大师课', desc: '向对方演示水垢清洁秘诀', probability: 4, icon: '🚰' }
                ],
                punishments: [
                    { title: '双重洗碗', desc: '今晚的碗要洗两遍', probability: 4, icon: '🍽️' },
                    { title: '精细擦灶', desc: '用棉签清洁燃气灶每个缝隙', probability: 5, icon: '🔥' },
                    { title: '小刀除垢', desc: '用塑料刮刀清除卫生间水垢', probability: 6, icon: '🔪' },
                    { title: '快速叠衣', desc: '1分钟内叠好8件T恤', probability: 5, icon: '👕' },
                    { title: '三重检查', desc: '接受对方对洗碗质量的三次复查', probability: 5, icon: '🔍' },
                    { title: '额外擦窗', desc: '多擦一个计划外的窗户', probability: 4, icon: '🪟' },
                    { title: '完美洗碗', desc: '每个碗都要达到可反光程度', probability: 5, icon: '✨' },
                    { title: '单手整理', desc: '用单手整理书架书籍', probability: 6, icon: '📚' },
                    { title: '冰箱清洁', desc: '清理冰箱门封条的霉斑', probability: 5, icon: '🧊' },
                    { title: '刷洗工具', desc: '刷洗所有用过的拖把和抹布', probability: 4, icon: '🪥' },
                    { title: '左手扫地', desc: '用不习惯的手执扫帚扫地', probability: 6, icon: '🧹' },
                    { title: '细节除尘', desc: '清除所有开关面板的灰尘', probability: 5, icon: '🔘' },
                    { title: '延长拖地', desc: '比平时多拖地5分钟', probability: 5, icon: '⏳' },
                    { title: '双任务', desc: '边洗碗边擦灶台', probability: 4, icon: '🎪' },
                    { title: '清水擦桌', desc: '只用清水擦拭整个餐桌', probability: 5, icon: '💧' },
                    { title: '颠倒顺序', desc: '先拖地后扫地', probability: 6, icon: '🔀' },
                    { title: '严格验收', desc: '对方用白手套检查家具灰尘', probability: 5, icon: '👔' },
                    { title: '单一工具', desc: '只能用一块抹布完成全部清洁', probability: 6, icon: '🧻' },
                    { title: '重复拖地', desc: '把刚拖过的地再拖一遍', probability: 4, icon: '🔁' },
                    { title: '整理鞋柜', desc: '额外整理杂乱的鞋柜', probability: 5, icon: '👟' },
                    { title: '创意洗碗', desc: '发明一个新的洗碗姿势', probability: 6, icon: '💃' },
                    { title: '慢速清洁', desc: '用慢动作擦拭所有镜子', probability: 5, icon: '🐌' },
                    { title: '完美铺床', desc: '床单平整到可弹硬币', probability: 4, icon: '🛏️' },
                    { title: '清洁水槽', desc: '彻底刷洗厨房水槽下水口', probability: 5, icon: '🚰' },
                    { title: '扩大范围', desc: '把阳台也纳入今天打扫范围', probability: 4, icon: '🌞' },
                    { title: '传统除尘', desc: '用旧报纸擦拭玻璃', probability: 5, icon: '📰' },
                    { title: '质量保证', desc: '保证擦过的桌子24小时不落灰', probability: 4, icon: '📝' },
                    { title: '监督洗碗', desc: '在对方注视下完成洗碗', probability: 5, icon: '👀' },
                    { title: '清洁汇报', desc: '口头报告厨房清洁过程', probability: 6, icon: '📢' },
                    { title: '明日准备', desc: '提前准备明天要用的清洁剂', probability: 5, icon: '🧴' }
                ]
            },
            {
                name: "今日买单",
                rewards: [
                    { title: '全额免单', desc: '今日消费由对方全额支付', probability: 2, icon: '🆓' },
                    { title: '餐饮报销', desc: '今日餐费全部由对方承担', probability: 3, icon: '🍽️' },
                    { title: '奶茶基金', desc: '获得对方提供的今日奶茶专项资金', probability: 7, icon: '🧋' },
                    { title: '零食补贴', desc: '获得50元零食采购基金', probability: 6, icon: '🍿' },
                    { title: '电影赞助', desc: '今晚电影票由对方购买', probability: 5, icon: '🎬' },
                    { title: '交通全包', desc: '今日出行费用由对方负责', probability: 4, icon: '🚗' },
                    { title: '购物券', desc: '获得200元以内购物报销额度', probability: 3, icon: '🛍️' },
                    { title: '甜品特权', desc: '今日甜品消费全部由对方支付', probability: 6, icon: '🍰' },
                    { title: '咖啡时光', desc: '本周咖啡由对方请客', probability: 5, icon: '☕' },
                    { title: '外卖自由', desc: '今晚外卖任选，对方买单', probability: 4, icon: '🍱' },
                    { title: '水果基金', desc: '获得水果采购专项资金', probability: 7, icon: '🍓' },
                    { title: '早餐券', desc: '明日早餐由对方负责购买', probability: 8, icon: '🍳' },
                    { title: '宵夜特权', desc: '今晚宵夜由对方请客', probability: 5, icon: '🍢' },
                    { title: '饮品畅饮', desc: '今日饮料消费全部报销', probability: 6, icon: '🥤' },
                    { title: '小吃街之旅', desc: '小吃街消费由对方全程买单', probability: 4, icon: '🎪' },
                    { title: '超市购物', desc: '100元以内超市购物由对方支付', probability: 5, icon: '🛒' },
                    { title: '美食探索', desc: '尝试新餐厅，对方出资', probability: 4, icon: '🍴' },
                    { title: '甜品店打卡', desc: '网红甜品店消费由对方负责', probability: 5, icon: '🍮' },
                    { title: '买菜基金', desc: '今日买菜费用由对方承担', probability: 6, icon: '🥬' },
                    { title: '烘焙材料', desc: '烘焙原料采购由对方支付', probability: 5, icon: '🧁' },
                    { title: '火锅基金', desc: '获得火锅专项消费资金', probability: 4, icon: '🍲' },
                    { title: '烧烤特权', desc: '今晚烧烤由对方请客', probability: 5, icon: '🍖' },
                    { title: '午餐券', desc: '今日午餐由对方买单', probability: 7, icon: '🍛' },
                    { title: '下午茶', desc: '享受对方付费的精致下午茶', probability: 5, icon: '🫖' },
                    { title: '食材采购', desc: '今日晚餐食材由对方出资采购', probability: 6, icon: '🛍️' },
                    { title: '便利店', desc: '便利店消费全部由对方支付', probability: 8, icon: '🏪' },
                    { title: '特色小吃', desc: '品尝特色小吃，对方报销', probability: 6, icon: '🥟' },
                    { title: '饮品店', desc: '网红饮品店消费由对方负责', probability: 5, icon: '🥤' },
                    { title: '半价优惠', desc: '今日消费只需支付一半金额', probability: 4, icon: '½' },
                    { title: '美食票', desc: '获得任意美食消费报销票', probability: 5, icon: '🎫' }
                ],
                punishments: [
                    { title: '全额买单', desc: '承担今日所有消费支出', probability: 3, icon: '💸' },
                    { title: '双倍支付', desc: '支付双倍餐费给对方', probability: 2, icon: '2️⃣' },
                    { title: '请客道歉', desc: '请对方吃最喜欢的食物道歉', probability: 5, icon: '🙏' },
                    { title: '甜品补偿', desc: '购买对方指定的甜品作为补偿', probability: 6, icon: '🍨' },
                    { title: '饮料服务', desc: '为对方购买一周的早餐饮料', probability: 4, icon: '🥛' },
                    { title: '零食供应', desc: '供应对方一周的零食需求', probability: 5, icon: '🍫' },
                    { title: '跑腿费', desc: '支付额外的跑腿服务费', probability: 6, icon: '🏃' },
                    { title: '利息支付', desc: '支付消费金额20%的利息', probability: 3, icon: '📈' },
                    { title: '双人餐费', desc: '支付下次双人用餐的全部费用', probability: 4, icon: '👥' },
                    { title: '美食券', desc: '赠送对方一张任意消费美食券', probability: 5, icon: '🎟️' },
                    { title: '外卖员', desc: '为对方点一次指定外卖', probability: 6, icon: '🛵' },
                    { title: '咖啡服务', desc: '为对方提供一周的咖啡服务', probability: 5, icon: '☕' },
                    { title: '水果采购', desc: '负责本周全部水果采购费用', probability: 4, icon: '🍉' },
                    { title: '宵夜责任', desc: '承担本周所有宵夜费用', probability: 5, icon: '🌙' },
                    { title: '饮料库存', desc: '补充满冰箱的饮料库存', probability: 6, icon: '🧃' },
                    { title: '食材补充', desc: '补充厨房短缺的食材', probability: 5, icon: '🥩' },
                    { title: '甜品债', desc: '欠对方一次甜品店任选机会', probability: 4, icon: '🍮' },
                    { title: '美食打卡', desc: '带对方打卡想去的餐厅并买单', probability: 5, icon: '📍' },
                    { title: '双倍零食', desc: '购买双倍分量的零食', probability: 6, icon: '📦' },
                    { title: '早餐服务', desc: '提供一周的早餐购买服务', probability: 4, icon: '🍞' },
                    { title: '午餐责任', desc: '承担明日午餐的全部费用', probability: 5, icon: '🍱' },
                    { title: '晚餐主办', desc: '主办今晚的晚餐并支付费用', probability: 4, icon: '🍛' },
                    { title: '饮料特权', desc: '让对方任意挑选一款饮料你买单', probability: 7, icon: '🥤' },
                    { title: '小吃补偿', desc: '购买对方想吃的小吃作为补偿', probability: 6, icon: '🍡' },
                    { title: '美食基金', desc: '建立对方专属的美食基金', probability: 4, icon: '💰' },
                    { title: '跑腿购买', desc: '立即为对方跑腿购买指定食物', probability: 5, icon: '🛒' },
                    { title: '甜品储备', desc: '储备对方喜欢的甜品填满冰箱', probability: 4, icon: '🧁' },
                    { title: '饮料补给', desc: '立即补给对方想喝的饮料', probability: 6, icon: '🍹' },
                    { title: '美食欠条', desc: '写下美食欠条，限期兑现', probability: 5, icon: '📝' },
                    { title: '双人美食', desc: '支付下次双人美食体验全款', probability: 4, icon: '💑' }
                ]
            }
        ];

        // 趣味挑战模板
        gameData.templates.funChallenge = [
            {
                name: "搞怪挑战",
                rewards: [
                    { title: '表情包赦免权', desc: '24小时内禁止对方保存你的丑照表情包', probability: 4, icon: '🙅' },
                    { title: '鬼脸删除券', desc: '可要求对方删除一张你的搞怪照片', probability: 5, icon: '📸' },
                    { title: '模仿豁免卡', desc: '本次可拒绝模仿指定动物或人物', probability: 6, icon: '🚫' },
                    { title: '怪声免疫', desc: '可拒绝发出一种指定的奇怪声音', probability: 7, icon: '🔇' },
                    { title: '舞蹈跳过券', desc: '可跳过一次滑稽舞蹈表演', probability: 5, icon: '💃' },
                    { title: '造型否决权', desc: '可拒绝一个离谱的造型打扮', probability: 6, icon: '👗' },
                    { title: '对戏选择权', desc: '可选择搞笑剧本中的角色', probability: 5, icon: '🎭' },
                    { title: '惩罚转移', desc: '将你的一个惩罚转移给对方', probability: 3, icon: '➡️' },
                    { title: '道具优先权', desc: '优先选择搞怪道具', probability: 7, icon: '🎪' },
                    { title: '台词修改权', desc: '可修改一段尴尬台词', probability: 6, icon: '📝' },
                    { title: '动作简化权', desc: '可简化一个复杂搞笑动作', probability: 5, icon: '👯' },
                    { title: '场景选择权', desc: '可选择挑战发生的地点', probability: 6, icon: '📍' },
                    { title: '时间控制权', desc: '可缩短挑战时间30秒', probability: 5, icon: '⏰' },
                    { title: '观众限制权', desc: '可限制观众人数', probability: 6, icon: '👀' },
                    { title: '重拍机会', desc: '视频挑战可重拍一次', probability: 5, icon: '🎥' },
                    { title: '表情保护', desc: '可戴墨镜完成表情挑战', probability: 7, icon: '😎' },
                    { title: '声音特效权', desc: '可为自己的表演添加音效', probability: 6, icon: '🎵' },
                    { title: '服装自主权', desc: '可自选一套搞怪服装', probability: 5, icon: '👔' },
                    { title: '搭档指定权', desc: '可指定对方一起完成挑战', probability: 4, icon: '👫' },
                    { title: '惩罚减免', desc: '可将惩罚程度降低一级', probability: 5, icon: '📉' },
                    { title: '即时奖励', desc: '完成挑战可获得对方按摩1分钟', probability: 6, icon: '💆' },
                    { title: '零食赞助', desc: '挑战后获得指定零食奖励', probability: 8, icon: '🍿' },
                    { title: '视频删除权', desc: '24小时后可删除挑战视频', probability: 4, icon: '🗑️' },
                    { title: '照片加密权', desc: '可为丑照设置查看密码', probability: 5, icon: '🔒' },
                    { title: '社交豁免', desc: '挑战内容可不发朋友圈', probability: 7, icon: '📱' },
                    { title: '时间推迟权', desc: '可将挑战推迟1小时执行', probability: 6, icon: '⏳' },
                    { title: '道具替换权', desc: '可替换一样道具', probability: 5, icon: '🔄' },
                    { title: '背景音乐权', desc: '可自选挑战时的背景音乐', probability: 6, icon: '🎶' },
                    { title: '灯光调控权', desc: '可调节挑战时的灯光效果', probability: 5, icon: '💡' },
                    { title: '挑战分割权', desc: '可将挑战分成两次完成', probability: 4, icon: '✂️' }
                ],
                punishments: [
                    { title: '魔性笑声', desc: '模仿一种卡通人物的魔性笑声1分钟', probability: 6, icon: '😂' },
                    { title: '企鹅走路', desc: '模仿企鹅走路绕房间一圈', probability: 7, icon: '🐧' },
                    { title: '倒念台词', desc: '倒着念一段经典台词', probability: 5, icon: '📜' },
                    { title: '鬼脸五连拍', desc: '做五个不同的鬼脸并拍照留存', probability: 8, icon: '🤪' },
                    { title: '机械舞模仿', desc: '模仿机器人动作30秒', probability: 6, icon: '🤖' },
                    { title: '儿歌新唱', desc: '用摇滚风唱一首儿歌', probability: 5, icon: '🎤' },
                    { title: '表情包还原', desc: '还原对方指定的一个表情包', probability: 7, icon: '🙈' },
                    { title: '动物模仿秀', desc: '连续模仿三种动物叫声和动作', probability: 6, icon: '🐯' },
                    { title: '倒放说话', desc: '尝试倒着说一句话', probability: 4, icon: '🎙️' },
                    { title: '慢动作表演', desc: '用慢动作表演喝水过程', probability: 5, icon: '🐌' },
                    { title: '盲摸识物', desc: '蒙眼通过触摸猜物品', probability: 6, icon: '👁️' },
                    { title: '方言朗诵', desc: '用方言朗诵一首诗', probability: 5, icon: '🗣️' },
                    { title: '反串表演', desc: '反串表演对方的一个习惯动作', probability: 6, icon: '👥' },
                    { title: '夸张表情', desc: '做出最夸张的惊喜表情并定格5秒', probability: 7, icon: '😱' },
                    { title: '镜像模仿', desc: '即时模仿对方的全部动作', probability: 6, icon: '🪞' },
                    { title: '塑料英语', desc: '用塑料英语介绍今晚的晚餐', probability: 5, icon: '🔠' },
                    { title: '无声表演', desc: '用肢体语言表演一个电影场景', probability: 6, icon: '🎬' },
                    { title: '快嘴挑战', desc: '用最快速度说绕口令', probability: 5, icon: '🗯️' },
                    { title: '造型定格', desc: '摆奇葩造型定格30秒', probability: 7, icon: '🧍' },
                    { title: '反转声调', desc: '用相反声调说话1分钟', probability: 4, icon: '🎚️' },
                    { title: '物品走秀', desc: '拿一件日常物品当时尚单品走秀', probability: 6, icon: '🛍️' },
                    { title: '双人鬼脸', desc: '与对方合作完成一个组合鬼脸', probability: 5, icon: '👯' },
                    { title: '即兴说唱', desc: '用生活用品即兴创作说唱', probability: 4, icon: '🎵' },
                    { title: '夸张广告', desc: '用夸张语气表演电视购物广告', probability: 6, icon: '📺' },
                    { title: '错位摄影', desc: '拍一张借位错位照片', probability: 7, icon: '📷' },
                    { title: '口型模仿', desc: '对口型模仿一段外语歌曲', probability: 5, icon: '🎶' },
                    { title: '慢速旋转', desc: '边转圈边说话直到头晕', probability: 6, icon: '🌀' },
                    { title: '倒立说话', desc: '靠着墙倒立尝试说话', probability: 3, icon: '🙃' },
                    { title: '多重人格', desc: '一人分饰两角对话30秒', probability: 5, icon: '👥' },
                    { title: '影子表演', desc: '用影子表演一个小动物', probability: 6, icon: '🦌' }
                ]
            },
            {
                name: "运动时间",
                rewards: [
                    { title: '深蹲豁免券', desc: '可免除今日的10个深蹲任务', probability: 6, icon: '🦵' },
                    { title: '平板支撑减时', desc: '平板支撑时间减少30秒', probability: 5, icon: '⏱️' },
                    { title: '仰卧起坐减半', desc: '今日仰卧起坐数量减半', probability: 7, icon: '📉' },
                    { title: '波比跳跳过卡', desc: '可跳过一轮波比跳训练', probability: 4, icon: '🚫' },
                    { title: '高抬腿替换权', desc: '将高抬腿替换为原地小跑', probability: 6, icon: '🔄' },
                    { title: '开合跳减量', desc: '开合跳次数减少15次', probability: 5, icon: '🔽' },
                    { title: '弓步蹲免做', desc: '免除今日弓步蹲训练', probability: 5, icon: '🙅' },
                    { title: '登山式缩短', desc: '登山式练习时间减半', probability: 6, icon: '⛰️' },
                    { title: '休息时间加倍', desc: '组间休息时间增加1分钟', probability: 7, icon: '🛋️' },
                    { title: '音乐选择权', desc: '优先选择运动时的背景音乐', probability: 8, icon: '🎵' },
                    { title: '场地决定权', desc: '选择今日运动的地点', probability: 6, icon: '📍' },
                    { title: '顺序调整权', desc: '调整运动项目的顺序', probability: 7, icon: '📋' },
                    { title: '计数监督权', desc: '由你为对方计数和监督动作', probability: 5, icon: '👀' },
                    { title: '双人协作权', desc: '指定一个双人协作运动项目', probability: 6, icon: '👫' },
                    { title: '拉伸主导权', desc: '由你带领进行运动后拉伸', probability: 5, icon: '🧘' },
                    { title: '即刻休息券', desc: '立即休息2分钟', probability: 4, icon: '⏸️' },
                    { title: '次数冻结权', desc: '本轮运动次数不再增加', probability: 5, icon: '❄️' },
                    { title: '强度降级', desc: '将高强度运动降为中等强度', probability: 6, icon: '🔽' },
                    { title: '时间兑换权', desc: '用拉伸时间抵扣运动时间', probability: 5, icon: '💱' },
                    { title: '动作标准豁免', desc: '本轮不要求动作完全标准', probability: 7, icon: '📏' },
                    { title: '间隔延长', desc: '运动间隔延长30秒', probability: 6, icon: '🕒' },
                    { title: '补充水分时间', desc: '额外获得30秒喝水休息时间', probability: 8, icon: '💧' },
                    { title: '毛巾服务', desc: '运动后享受对方递毛巾服务', probability: 5, icon: '🧻' },
                    { title: '按摩特权', desc: '运动后获得2分钟肌肉按摩', probability: 4, icon: '💆' },
                    { title: '降温优先权', desc: '优先使用电风扇或空调', probability: 7, icon: '❄️' },
                    { title: '计数优惠', desc: '所有运动计数打八折', probability: 5, icon: '8️⃣' },
                    { title: '明日预支休息', desc: '预支明天5分钟运动休息时间', probability: 4, icon: '📅' },
                    { title: '速度自控权', desc: '可自控运动节奏快慢', probability: 6, icon: '🎛️' },
                    { title: '动作创新权', desc: '可自创一个运动动作', probability: 5, icon: '💡' },
                    { title: '运动装备优先使用权', desc: '优先使用好的运动装备', probability: 6, icon: '👟' }
                ],
                punishments: [
                    { title: '双倍深蹲', desc: '深蹲数量立即翻倍', probability: 4, icon: '2️⃣' },
                    { title: '慢速平板支撑', desc: '以慢动作完成平板支撑1分钟', probability: 5, icon: '🐌' },
                    { title: '高抬腿加速', desc: '高抬腿速度提升至最快', probability: 6, icon: '💨' },
                    { title: '波比跳加量', desc: '额外增加5个波比跳', probability: 5, icon: '➕' },
                    { title: '单腿仰卧起坐', desc: '用单腿力量完成仰卧起坐', probability: 4, icon: '🦵' },
                    { title: '闭眼平衡', desc: '闭眼单脚站立1分钟', probability: 5, icon: '🙈' },
                    { title: '反向弓步蹲', desc: '做反向弓步蹲10次', probability: 6, icon: '↩️' },
                    { title: '快速登山式', desc: '加快速度完成登山式30秒', probability: 5, icon: '⛰️' },
                    { title: '跳跃弓步', desc: '做跳跃弓步蹲8次', probability: 4, icon: '💥' },
                    { title: '宽距俯卧撑', desc: '做宽距俯卧撑5个', probability: 5, icon: '↔️' },
                    { title: '慢速开合跳', desc: '用慢动作完成开合跳20次', probability: 6, icon: '🐢' },
                    { title: '俄罗斯转体加时', desc: '俄罗斯转体增加30秒', probability: 5, icon: '🔄' },
                    { title: '单腿波比跳', desc: '尝试单腿波比跳3次', probability: 3, icon: '🦿' },
                    { title: '跳跃深蹲', desc: '完成跳跃深蹲10次', probability: 4, icon: '🦘' },
                    { title: '倒立行走尝试', desc: '尝试靠墙倒立行走3步', probability: 2, icon: '🤸' },
                    { title: '蛙跳前进', desc: '蛙跳绕房间一圈', probability: 5, icon: '🐸' },
                    { title: '螃蟹走路', desc: '螃蟹式横移10米', probability: 6, icon: '🦀' },
                    { title: '熊爬挑战', desc: '熊爬姿势前进5米', probability: 5, icon: '🐻' },
                    { title: '鸭步行走', desc: '深蹲鸭步行走10步', probability: 6, icon: '🦆' },
                    { title: '快速踮脚', desc: '快速踮脚50次', probability: 7, icon: '👣' },
                    { title: '左右跳障碍', desc: '左右跳过一件物品20次', probability: 5, icon: '🔄' },
                    { title: '单脚跳圈', desc: '单脚跳绕小圈10次', probability: 6, icon: '⭕' },
                    { title: '弯腰触趾跳', desc: '跳跃中弯腰触脚趾10次', probability: 5, icon: '🦶' },
                    { title: '快速转体', desc: '快速左右转体30次', probability: 6, icon: '🌀' },
                    { title: '举手深蹲', desc: '深蹲时双手举过头顶', probability: 5, icon: '🙌' },
                    { title: '交叉登山', desc: '做交叉登山式20次', probability: 4, icon: '❌' },
                    { title: '跳跃拍膝', desc: '跳跃中双膝相碰8次', probability: 5, icon: '🦵' },
                    { title: '快速摆臂', desc: '快速摆臂运动1分钟', probability: 7, icon: '💪' },
                    { title: '单腿平衡触地', desc: '单腿站立弯腰触地5次', probability: 4, icon: '📥' },
                    { title: '连续蹲跳', desc: '连续蹲跳15次不休息', probability: 5, icon: '⚡' }
                ]
            }
        ];

        // 浪漫瞬间模板
        gameData.templates.romanticMoment = [
            {
                name: "约会计划",
                rewards: [
                    { title: '约会目的地决定权', desc: '独家决定下次约会的目的地（公园/商场/景点等）', probability: 7, icon: '📍' },
                    { title: '餐厅类型选择权', desc: '选择下次约会的餐厅菜系（中餐/西餐/日料等）', probability: 6, icon: '🍽️' },
                    { title: '约会日期优先权', desc: '优先选择下次约会的具体日期', probability: 5, icon: '📅' },
                    { title: '约会时间决定权', desc: '决定下次约会的出发时间', probability: 6, icon: '⏰' },
                    { title: '交通方式选择权', desc: '选择约会出行的交通方式', probability: 7, icon: '🚗' },
                    { title: '电影类型决定权', desc: '选择约会时观看的电影类型', probability: 6, icon: '🎬' },
                    { title: '约会穿搭建议权', desc: '为对方建议约会当天的穿搭风格', probability: 5, icon: '👔' },
                    { title: '约会活动安排权', desc: '安排约会中的主要活动内容', probability: 4, icon: '🎯' },
                    { title: '约会预算控制权', desc: '掌控本次约会的整体预算', probability: 5, icon: '💰' },
                    { title: '约会时长决定权', desc: '决定本次约会的持续时间', probability: 6, icon: '🕒' },
                    { title: '拍照地点选择权', desc: '选择约会中的拍照地点和背景', probability: 7, icon: '📸' },
                    { title: '约会音乐选择权', desc: '决定约会途中的背景音乐', probability: 8, icon: '🎵' },
                    { title: '约会主题设定权', desc: '为本次约会设定一个主题', probability: 5, icon: '🎪' },
                    { title: '约会结束方式决定权', desc: '决定约会如何结束（送回家/各自回家等）', probability: 6, icon: '🌙' },
                    { title: '约会备用计划决定权', desc: '制定约会的备用方案（如下雨天的室内活动）', probability: 5, icon: '☔' },
                    { title: '约会惊喜决定权', desc: '决定是否准备及准备什么惊喜', probability: 4, icon: '🎁' },
                    { title: '约会餐饮决定权', desc: '决定正餐外的饮品小吃', probability: 7, icon: '🍿' },
                    { title: '约会节奏控制权', desc: '控制约会的节奏（紧凑或悠闲）', probability: 6, icon: '🎚️' },
                    { title: '约会纪念方式决定权', desc: '决定如何纪念本次约会', probability: 5, icon: '📝' },
                    { title: '下次约会预约权', desc: '优先提出并确定下下次约会时间', probability: 4, icon: '📆' },
                    { title: '约会天气决定权', desc: '若天气不佳，决定改期或继续', probability: 6, icon: '🌤️' },
                    { title: '约会同伴决定权', desc: '决定是否邀请其他朋友参与', probability: 5, icon: '👥' },
                    { title: '约会妆容建议权', desc: '为对方建议约会妆容风格', probability: 4, icon: '💄' },
                    { title: '约会聊天话题决定权', desc: '设定约会的主要聊天话题', probability: 7, icon: '💬' },
                    { title: '约会礼物决定权', desc: '决定是否互送及送什么礼物', probability: 5, icon: '🎀' },
                    { title: '约会分享决定权', desc: '决定在社交媒体分享哪些内容', probability: 6, icon: '📱' },
                    { title: '约会回忆记录权', desc: '决定如何记录约会美好瞬间', probability: 5, icon: '📹' },
                    { title: '约会心情调节权', desc: '若一方心情不佳，决定如何调节', probability: 4, icon: '😊' },
                    { title: '约会开销分配权', desc: '决定约会费用的分担方式', probability: 6, icon: '💳' },
                    { title: '约会反馈收集权', desc: '收集对方对本次约会的评价和建议', probability: 5, icon: '📊' }
                ],
                punishments: [
                    { title: '约会计划书', desc: '立即制定一份详细的约会计划书', probability: 5, icon: '📋' },
                    { title: '餐厅调研员', desc: '调研并推荐三家适合约会的餐厅', probability: 6, icon: '🔍' },
                    { title: '行程规划师', desc: '规划一个完整的半日约会行程', probability: 4, icon: '🗺️' },
                    { title: '天气备份计划', desc: '制定约会日的雨天备用方案', probability: 5, icon: '☔' },
                    { title: '约会预算表', desc: '制作一份详细的约会预算表', probability: 4, icon: '💰' },
                    { title: '交通路线规划', desc: '规划约会日的具体出行路线', probability: 6, icon: '🚦' },
                    { title: '电影排期调查', desc: '调查并推荐三部近期上映的电影', probability: 7, icon: '🎞️' },
                    { title: '穿搭建议书', desc: '为对方提供详细的穿搭建议', probability: 5, icon: '👗' },
                    { title: '话题准备清单', desc: '准备十个约会聊天话题', probability: 6, icon: '📜' },
                    { title: '约会备忘录', desc: '列出约会需要携带的物品清单', probability: 7, icon: '📝' },
                    { title: '餐厅预订员', desc: '立即完成约会餐厅的预订', probability: 5, icon: '📞' },
                    { title: '电影票购买', desc: '立即购买约会日的电影票', probability: 6, icon: '🎫' },
                    { title: '行程时间表', desc: '制作详细的约会时间安排表', probability: 4, icon: '⏱️' },
                    { title: '地点调研报告', desc: '提供三个约会地点的详细对比', probability: 5, icon: '📊' },
                    { title: '约会创意收集', desc: '收集五个有创意的约会点子', probability: 6, icon: '💡' },
                    { title: '交通备选方案', desc: '准备三种不同的出行方案', probability: 5, icon: '🚇' },
                    { title: '紧急联系人设置', desc: '设置约会日的紧急联系方案', probability: 4, icon: '📱' },
                    { title: '约会费用预估', desc: '详细预估约会各项费用', probability: 5, icon: '🧮' },
                    { title: '穿着天气提醒', desc: '根据天气预报提供着装建议', probability: 6, icon: '🌡️' },
                    { title: '拍照点位规划', desc: '规划约会途中的拍照地点', probability: 5, icon: '📷' },
                    { title: '餐厅菜单研究', desc: '提前研究目标餐厅的推荐菜品', probability: 6, icon: '🍜' },
                    { title: '电影简介准备', desc: '准备约会电影的剧情简介', probability: 7, icon: '🎭' },
                    { title: '约会时长规划', desc: '合理规划每个环节的时间', probability: 5, icon: '⏳' },
                    { title: '休息点位安排', desc: '安排约会途中的休息地点', probability: 6, icon: '🛋️' },
                    { title: '纪念品采购计划', desc: '规划纪念品采购的地点和预算', probability: 5, icon: '🛍️' },
                    { title: '心情调节方案', desc: '准备约会心情不佳时的应对方案', probability: 4, icon: '😌' },
                    { title: '意外处理预案', desc: '制定约会意外的处理方案', probability: 5, icon: '🚨' },
                    { title: '回家方式安排', desc: '安排约会结束后的回家方式', probability: 6, icon: '🏠' },
                    { title: '约会反馈表', desc: '设计约会后的反馈问卷', probability: 5, icon: '📄' },
                    { title: '下次约会提案', desc: '提出三个下次约会的初步方案', probability: 4, icon: '📑' }
                ]
            },
            {
                name: "爱的表达",
                rewards: [
                    { title: '深情凝视', desc: '与对方深情对视1分钟，不许笑场', probability: 6, icon: '👀' },
                    { title: '甜蜜公主抱', desc: '获得对方公主抱30秒', probability: 4, icon: '👸' },
                    { title: '额头轻吻', desc: '获得对方温柔的额头吻', probability: 7, icon: '💋' },
                    { title: '背后拥抱', desc: '获得对方从背后的温暖拥抱1分钟', probability: 6, icon: '🤗' },
                    { title: '手写情书', desc: '获得对方现场手写的小情书', probability: 5, icon: '💌' },
                    { title: '真情告白', desc: '听对方用30秒诉说爱你理由', probability: 6, icon: '📢' },
                    { title: '梳发服务', desc: '享受对方为你温柔梳头1分钟', probability: 7, icon: '💇' },
                    { title: '按摩时光', desc: '获得对方2分钟的肩部按摩', probability: 5, icon: '💆' },
                    { title: '专属昵称', desc: '听对方用10个爱称呼唤你', probability: 8, icon: '😘' },
                    { title: '回忆重温', desc: '听对方讲述最心动的初遇瞬间', probability: 5, icon: '📖' },
                    { title: '甜蜜喂食', desc: '享受对方亲手喂你吃一口零食', probability: 7, icon: '🍓' },
                    { title: '情歌独唱', desc: '听对方为你清唱一段情歌', probability: 4, icon: '🎤' },
                    { title: '舞蹈邀约', desc: '与对方相拥慢舞1分钟', probability: 5, icon: '💃' },
                    { title: '赞美风暴', desc: '听对方连续赞美你1分钟', probability: 6, icon: '🌟' },
                    { title: '系鞋带服务', desc: '享受对方单膝为你系鞋带', probability: 5, icon: '👟' },
                    { title: '整理仪容', desc: '享受对方为你整理衣领或头发', probability: 7, icon: '💁' },
                    { title: '暖手服务', desc: '对方用双手为你暖手1分钟', probability: 6, icon: '🤲' },
                    { title: '未来描绘', desc: '听对方描述有你的美好未来', probability: 4, icon: '🔮' },
                    { title: '感谢清单', desc: '听对方列举最感谢你的三件事', probability: 5, icon: '🙏' },
                    { title: '护手霜服务', desc: '享受对方为你涂护手霜', probability: 7, icon: '🧴' },
                    { title: '膝枕时光', desc: '享受1分钟膝枕服务', probability: 5, icon: '🛋️' },
                    { title: '刮胡子服务', desc: '享受对方帮你刮胡子（仅限男性）', probability: 3, icon: '✂️' },
                    { title: '画眉之乐', desc: '享受对方为你画眉（仅限女性）', probability: 3, icon: '✏️' },
                    { title: '洗脚服务', desc: '享受对方为你洗脚', probability: 2, icon: '🦶' },
                    { title: '早安问候', desc: '明早获得对方特别温柔的早安吻', probability: 6, icon: '🌞' },
                    { title: '晚安故事', desc: '今晚获得对方亲自讲述的睡前故事', probability: 5, icon: '🌙' },
                    { title: '爱心便当', desc: '明天获得对方准备的爱心便当', probability: 4, icon: '🍱' },
                    { title: '惊喜小礼', desc: '三天内获得对方准备的神秘小礼物', probability: 3, icon: '🎁' },
                    { title: '照片回顾', desc: '与对方一起回顾甜蜜照片1分钟', probability: 7, icon: '📸' },
                    { title: '爱情誓言', desc: '听对方重新宣读爱情誓言', probability: 4, icon: '💍' }
                ],
                punishments: [
                    { title: '大声示爱', desc: '在窗边大声喊"我爱你"三次', probability: 5, icon: '📢' },
                    { title: '情诗创作', desc: '2分钟内创作一首四行情诗并朗读', probability: 4, icon: '✍️' },
                    { title: '求婚情景再现', desc: '单膝跪地重现求婚场景', probability: 3, icon: '💍' },
                    { title: '模仿求婚', desc: '用蔬菜或水果模仿求婚场景', probability: 6, icon: '🥦' },
                    { title: '爱情宣誓', desc: '举手宣誓永远爱对方', probability: 5, icon: '✋' },
                    { title: '肉麻情话', desc: '说三句最肉麻的情话', probability: 7, icon: '💝' },
                    { title: '爱情舞蹈', desc: '自编一段表达爱意的舞蹈', probability: 4, icon: '🕺' },
                    { title: '歌曲改编', desc: '把流行歌词改成表白歌词唱出', probability: 3, icon: '🎵' },
                    { title: '身体比心', desc: '用身体摆出爱心造型', probability: 5, icon: '💖' },
                    { title: '爱情剧场', desc: '1分钟表演爱情电影经典桥段', probability: 4, icon: '🎭' },
                    { title: '爱情证书', desc: '现场制作并颁发"最佳伴侣证书"', probability: 5, icon: '📜' },
                    { title: '吻痕留印', desc: '在对方手背留下一个唇印', probability: 6, icon: '💋' },
                    { title: '爱情谜语', desc: '创作一个关于对方的名字谜语', probability: 4, icon: '❓' },
                    { title: '爱情地图', desc: '画出相识相恋的重要地点地图', probability: 3, icon: '🗺️' },
                    { title: '爱情食谱', desc: '创作一道以对方名字命名的菜谱', probability: 5, icon: '🍳' },
                    { title: '情侣手印', desc: '在纸上留下情侣手印并签名', probability: 6, icon: '👐' },
                    { title: '爱情密码', desc: '发明一个只有两人懂的爱的密码', probability: 4, icon: '🔐' },
                    { title: '爱情印章', desc: '用胡萝卜或土豆刻一个爱心印章', probability: 3, icon: '🍠' },
                    { title: '情侣暗号', desc: '设计一个专属的爱的暗号', probability: 5, icon: '🤫' },
                    { title: '爱情广播', desc: '用广播腔播报你们的爱情故事', probability: 4, icon: '📻' },
                    { title: '爱心料理', desc: '把食物摆成爱心形状喂对方', probability: 6, icon: '🍎' },
                    { title: '爱情邮票', desc: '设计一张专属的爱情邮票', probability: 4, icon: '🏷️' },
                    { title: '情侣商标', desc: '设计一个专属的情侣品牌商标', probability: 3, icon: '🏷️' },
                    { title: '爱情徽章', desc: '用纸设计一个爱情徽章别在对方胸前', probability: 5, icon: '📌' },
                    { title: '情侣护照', desc: '制作一个畅行爱情王国的护照', probability: 4, icon: '📘' },
                    { title: '爱情存折', desc: '制作一个存储甜蜜瞬间的存折', probability: 5, icon: '💰' },
                    { title: '情侣签证', desc: '为对方签发通往你内心的签证', probability: 4, icon: '🛂' },
                    { title: '爱情合约', desc: '撰写一份永远相爱的合约', probability: 3, icon: '📃' },
                    { title: '心灵感应', desc: '闭眼猜测对方此刻在想什么', probability: 6, icon: '🔮' },
                    { title: '爱情预言', desc: '预言两人未来会经历的美好事情', probability: 5, icon: '🔮' }
                ]
            }
        ];

        // 情趣游戏模板
        gameData.templates.intimateGame = [
            {
                name: "酒酣耳热",
                rewards: [
                    { title: '衣领探秘', desc: '可伸手探入对方衣领内侧，停留30秒', probability: 4, icon: '👔' },
                    { title: '耳畔私刑', desc: '用嘴唇轻含对方耳垂，持续20秒', probability: 5, icon: '👂' },
                    { title: '腰带管辖', desc: '可单手探入对方腰带下方，停留15秒', probability: 3, icon: '👖' },
                    { title: '膝上特权', desc: '让对方坐在你腿上完成下一杯酒', probability: 6, icon: '🦵' },
                    { title: '纽扣解放', desc: '可解开对方衬衫/外套的第一颗纽扣', probability: 7, icon: '🔘' },
                    { title: '锁骨品鉴', desc: '亲吻对方锁骨区域10秒', probability: 5, icon: '💋' },
                    { title: '腰间勘探', desc: '将手伸入对方后腰衣物内，停留20秒', probability: 4, icon: '🧭' },
                    { title: '发丝缠绕', desc: '用手指缠绕对方头发把玩1分钟', probability: 8, icon: '💇' },
                    { title: '足踝掌控', desc: '可握住对方脚踝轻揉30秒', probability: 5, icon: '🦶' },
                    { title: '唇印认证', desc: '在对方脖颈留下一个唇印', probability: 6, icon: '💄' },
                    { title: '背部测绘', desc: '用手指在对方背部画圈2分钟', probability: 7, icon: '🗺️' },
                    { title: '腕间禁锢', desc: '用嘴唇轻吻对方手腕内侧30秒', probability: 6, icon: '⌚' },
                    { title: '膝内探索', desc: '用手指在对方膝盖内侧画圈1分钟', probability: 5, icon: '🌀' },
                    { title: '颈后特权', desc: '可亲吻对方后颈部位15秒', probability: 6, icon: '🔙' },
                    { title: '腰间束缚', desc: '用双臂从后方环抱对方腰部1分钟', probability: 7, icon: '🫂' },
                    { title: '指尖诱惑', desc: '含住对方指尖轻轻吮吸10秒', probability: 4, icon: '👆' },
                    { title: '足底特权', desc: '可抚摸对方脚底30秒', probability: 5, icon: '🦶' },
                    { title: '腰间链权', desc: '可玩弄对方裤腰链/腰带1分钟', probability: 6, icon: '⛓️' },
                    { title: '耳后禁区', desc: '可亲吻对方耳后敏感区域20秒', probability: 5, icon: '🚫' },
                    { title: '腿间游戏', desc: '用膝盖轻触对方双腿内侧30秒', probability: 4, icon: '🦵' },
                    { title: '唇间渡酒', desc: '用嘴对嘴的方式喂对方一口酒', probability: 3, icon: '🍷' },
                    { title: '镜前掌控', desc: '在镜子前从背后拥抱对方1分钟', probability: 6, icon: '🪞' },
                    { title: '椅背支配', desc: '让对方靠在椅背上俯身亲吻10秒', probability: 5, icon: '💺' },
                    { title: '暗处探索', desc: '在昏暗灯光下探索对方腰间曲线', probability: 4, icon: '🔦' },
                    { title: '桌面游戏', desc: '让对方靠在桌边进行亲密接触', probability: 5, icon: '🪑' },
                    { title: '墙边特权', desc: '可将对方轻按在墙上耳语30秒', probability: 6, icon: '🧱' },
                    { title: '地毯时间', desc: '可在地毯上枕着对方腿部2分钟', probability: 7, icon: '🧸' },
                    { title: '窗边冒险', desc: '在窗帘后进行短暂亲密接触', probability: 4, icon: '🪟' },
                    { title: '沙发征服', desc: '在沙发上掌控对方行动1分钟', probability: 5, icon: '🛋️' },
                    { title: '阴影游戏', desc: '在房间阴影处进行秘密接触', probability: 6, icon: '🌑' }
                ],
                punishments: [
                    { title: '内衣秀', desc: '展示性感情趣内衣（限已有）', probability: 5, icon: '👙' },
                    { title: '钢管舞', desc: '模仿钢管舞动作绕椅旋转1分钟', probability: 6, icon: '💃' },
                    { title: '脱衣骰子', desc: '掷骰子决定脱掉哪件衣物', probability: 4, icon: '🎲' },
                    { title: '肉体盛宴', desc: '在身上放置水果让对方取食', probability: 3, icon: '🍓' },
                    { title: '束缚游戏', desc: '用领带/丝巾轻轻绑住手腕30秒', probability: 5, icon: '🧣' },
                    { title: '蒙眼喂食', desc: '蒙眼让对方喂你吃水果', probability: 6, icon: '👁️' },
                    { title: '膝行敬酒', desc: '跪着用嘴递酒杯给对方', probability: 4, icon: '🍶' },
                    { title: '人体寿司', desc: '躺下让对方在你身上放置食物', probability: 3, icon: '🍣' },
                    { title: '色子脱衣', desc: '掷色子点数决定脱衣件数', probability: 5, icon: '🎲' },
                    { title: '冰火考验', desc: '用冰块在皮肤上划圈30秒', probability: 4, icon: '❄️' },
                    { title: '唇膏画身', desc: '用口红在对方身上画爱心', probability: 6, icon: '💄' },
                    { title: '内衣外穿', desc: '将内衣外穿进行下一轮游戏', probability: 5, icon: '👚' },
                    { title: '蒙眼识体', desc: '蒙眼通过触摸识别对方身体部位', probability: 4, icon: '🙈' },
                    { title: '人体酒杯', desc: '用身体凹陷处盛酒让对方饮用', probability: 3, icon: '🥂' },
                    { title: '性感爬行', desc: '用性感姿势爬行一圈', probability: 5, icon: '🐆' },
                    { title: '束缚投喂', desc: '双手被缚让对方喂你喝酒', probability: 4, icon: '🤲' },
                    { title: '镜前独舞', desc: '在镜前跳1分钟性感舞蹈', probability: 6, icon: '🪞' },
                    { title: '桌面热舞', desc: '在桌面上跳30秒诱惑舞蹈', probability: 5, icon: '🪑' },
                    { title: '灯光秀', desc: '用手机灯光在身上打光表演', probability: 7, icon: '🔦' },
                    { title: '影子诱惑', desc: '用影子表演性感动作1分钟', probability: 6, icon: '👤' },
                    { title: '语音诱惑', desc: '用性感声音读一段文字', probability: 8, icon: '🎙️' },
                    { title: '眼神勾引', desc: '用魅惑眼神注视对方1分钟', probability: 7, icon: '😉' },
                    { title: '唇语游戏', desc: '用嘴唇无声表达挑逗话语', probability: 6, icon: '👄' },
                    { title: '体温传递', desc: '用身体不同部位温暖冰块', probability: 5, icon: '🌡️' },
                    { title: '气味诱惑', desc: '让对方闻你身上的香水/体味', probability: 7, icon: '👃' },
                    { title: '声音控制', desc: '根据对方指令发出不同声音', probability: 6, icon: '🎚️' },
                    { title: '延迟满足', desc: '挑逗后立即停止，等待下一轮', probability: 5, icon: '⏳' },
                    { title: '感官剥夺', desc: '蒙眼体验对方触摸30秒', probability: 4, icon: '🔇' },
                    { title: '温度游戏', desc: '用不同温度物体轻触皮肤', probability: 5, icon: '🔥' },
                    { title: '纹理探索', desc: '用不同材质物品摩擦皮肤', probability: 6, icon: '🧵' }
                ]
            },
            {
                name: "亲密游戏",
                rewards: [
                    { title: '主导权获取', desc: '获得接下来5分钟性爱过程的主导权', probability: 6, icon: '👑' },
                    { title: '姿势选择权', desc: '选择下一个性爱姿势', probability: 8, icon: '🔄' },
                    { title: '敏感带探索', desc: '专注探索对方一处敏感带2分钟', probability: 7, icon: '🎯' },
                    { title: '速度控制权', desc: '控制性爱节奏快慢1分钟', probability: 6, icon: '🎛️' },
                    { title: '轻咬特权', desc: '可在对方肩颈处轻咬留下痕迹', probability: 5, icon: '🦷' },
                    { title: '言语挑逗权', desc: '在耳边说30秒挑逗情话', probability: 8, icon: '💬' },
                    { title: '延时特权', desc: '要求对方暂停动作保持插入状态30秒', probability: 4, icon: '⏸️' },
                    { title: '道具使用权', desc: '选择使用一种情趣道具', probability: 5, icon: '🎁' },
                    { title: '感官专注', desc: '蒙住对方眼睛进行1分钟爱抚', probability: 6, icon: '👁️' },
                    { title: '深度探索', desc: '尝试一个更深入的插入角度', probability: 5, icon: '🔍' },
                    { title: '节奏突变', desc: '突然改变抽插节奏让对方意外', probability: 7, icon: '⚡' },
                    { title: '多重刺激', desc: '同时刺激两处敏感带1分钟', probability: 6, icon: '✌️' },
                    { title: '温度游戏', desc: '使用温热按摩油进行爱抚', probability: 5, icon: '🌡️' },
                    { title: '声音控制', desc: '要求对方发出更大呻吟声', probability: 6, icon: '🔊' },
                    { title: '体位微调', desc: '微调现有体位获得更佳体验', probability: 7, icon: '🔄' },
                    { title: '专注亲吻', desc: '要求对方专注亲吻1分钟', probability: 8, icon: '💋' },
                    { title: '高潮延迟', desc: '在临界点暂停延长高潮时间', probability: 4, icon: '⏳' },
                    { title: '角色扮演', desc: '要求对方配合简单角色扮演', probability: 5, icon: '🎭' },
                    { title: '环境调控', desc: '调整灯光音乐营造更好氛围', probability: 7, icon: '💡' },
                    { title: '专注服务', desc: '要求对方专注服务你的敏感带', probability: 6, icon: '🎯' },
                    { title: '深度亲吻', desc: '进行1分钟法式深吻', probability: 8, icon: '😘' },
                    { title: '节奏掌控', desc: '完全掌控抽插节奏2分钟', probability: 5, icon: '🥁' },
                    { title: '特殊角度', desc: '尝试一个特殊的性爱角度', probability: 6, icon: '📐' },
                    { title: '双重刺激', desc: '要求额外的前列腺/G点刺激', probability: 4, icon: '🎯' },
                    { title: '感官剥夺', desc: '蒙眼进行1分钟专注爱抚', probability: 5, icon: '🙈' },
                    { title: '力度控制', desc: '要求特定力度进行刺激', probability: 7, icon: '💪' },
                    { title: '专注前戏', desc: '延长前戏时间2分钟', probability: 6, icon: '⏰' },
                    { title: '特殊区域', desc: '探索一个平时忽略的敏感区', probability: 5, icon: '🗺️' },
                    { title: '交替节奏', desc: '快慢交替的节奏变化1分钟', probability: 6, icon: '🔄' },
                    { title: '深度连接', desc: '保持深度插入静止感受连接', probability: 5, icon: '🔗' },
                    { title: '温度游戏', desc: '使用温水或冰水在对方背部画圈1分钟', probability: 4, icon: '🌡️' },
                    { title: '束缚体验', desc: '用丝巾轻轻束缚对方手腕60秒', probability: 5, icon: '🎀' },
                    { title: '感官聚焦', desc: '蒙住对方眼睛，专注爱抚1分钟', probability: 6, icon: '👁️' },
                    { title: '亲吻专权', desc: '指定对方身体任意部位获得专注亲吻30秒', probability: 7, icon: '💋' },
                    { title: '道具优先', desc: '优先选择并使用一件情趣玩具2分钟', probability: 4, icon: '🎁' },
                    { title: '声音指令', desc: '通过耳语指令控制对方动作1分钟', probability: 5, icon: '📢' },
                    { title: '位置交换', desc: '要求立即交换上下位置', probability: 6, icon: '🔄' },
                    { title: '深度特权', desc: '要求10次特别深入的冲击', probability: 5, icon: '🔽' },
                    { title: '暂停挑逗', desc: '在关键时刻完全静止，只进行眼神交流30秒', probability: 4, icon: '🚦' },
                    { title: '角度调整', desc: '使用枕头调整到最舒适的角度2分钟', probability: 7, icon: '🛏️' },
                    { title: '镜前特权', desc: '在镜子前进行并由你指导动作1分钟', probability: 4, icon: '🪞' },
                    { title: '灯光控制', desc: '调整灯光到最喜爱的亮度', probability: 8, icon: '💡' },
                    { title: '音乐选择', desc: '选择背景音乐的类型', probability: 7, icon: '🎶' },
                    { title: '精油按摩', desc: '享受对方用精油按摩背部2分钟', probability: 5, icon: '💆' },
                    { title: '言语支配', desc: '享受对方1分钟的赞美和情话', probability: 6, icon: '💬' },
                    { title: '延迟满足', desc: '要求对方接近高潮时暂停，改为爱抚30秒', probability: 4, icon: '⏳' },
                    { title: '水温游戏', desc: '要求用不同温度的水交替爱抚', probability: 5, icon: '🚿' },
                    { title: '纹理体验', desc: '使用不同材质布料轻抚皮肤1分钟', probability: 6, icon: '🧵' },
                    { title: '呼吸同步', desc: '要求对方与你保持同步深呼吸1分钟', probability: 5, icon: '🌬️' },
                    { title: '压力控制', desc: '指导对方使用不同的按压力度', probability: 6, icon: '✋' },
                    { title: '专注凝视', desc: '要求全程保持眼神接触1分钟', probability: 5, icon: '👀' },
                    { title: '声音反馈', desc: '要求对方用声音回应你的每个动作', probability: 6, icon: '🎤' },
                    { title: '终局控制', desc: '由你决定高潮的时机', probability: 4, icon: '🏁' },
                    { title: '特殊亲吻权', desc: '可以在平时不允许的部位亲吻30秒', probability: 5, icon: '💋' },
                    { title: '叫停特权', desc: '可以在任何时刻暂停10秒', probability: 8, icon: '✋' },
                    { title: '深度控制权', desc: '可以控制进入的深度和角度', probability: 5, icon: '📏' },
                    { title: '束缚体验权', desc: '可以用丝巾轻轻束缚对方手腕', probability: 3, icon: '🎀' },
                    { title: '环境控制权', desc: '可以调整灯光和音乐营造氛围', probability: 7, icon: '💡' },
                    { title: '特殊爱抚权', desc: '可以用非传统方式爱抚敏感部位', probability: 6, icon: '✋' },
                    { title: '高潮控制权', desc: '可以控制对方接近高潮的边缘', probability: 4, icon: '🎢' },
                    { title: '事后决定权', desc: '可以决定事后的清洁和温存方式', probability: 8, icon: '🛁' },
                    { title: '服装要求权', desc: '可以要求对方穿着特定内衣', probability: 6, icon: '👙' },
                    { title: '姿势保持权', desc: '可以要求对方保持某个姿势30秒', probability: 5, icon: '🧘' },
                    { title: '特殊称呼权', desc: '可以在过程中使用特殊称呼', probability: 7, icon: '🏷️' },
                    { title: '敏感度测试权', desc: '可以测试对方不同部位的敏感度', probability: 6, icon: '📊' },
                    { title: '创意姿势权', desc: '可以尝试一个创新的性爱姿势', probability: 5, icon: '💡' }
                ],
                punishments: [
                    { title: '边缘控制', desc: '在高潮边缘被强制暂停1分钟', probability: 4, icon: '🚦' },
                    { title: '感官限制', desc: '被蒙眼进行2分钟性爱', probability: 6, icon: '👁️' },
                    { title: '言语羞辱', desc: '听对方说30秒挑逗性羞辱话语', probability: 5, icon: '💬' },
                    { title: '姿势限制', desc: '保持一个较累的姿势2分钟', probability: 5, icon: '🧎' },
                    { title: '节奏受控', desc: '完全由对方控制节奏1分钟', probability: 7, icon: '🎛️' },
                    { title: '敏感带回避', desc: '被禁止接触最敏感部位2分钟', probability: 4, icon: '🚫' },
                    { title: '延迟满足', desc: '被要求延迟高潮2分钟', probability: 5, icon: '⏳' },
                    { title: '特殊服务', desc: '为对方进行2分钟专注口交', probability: 6, icon: '👅' },
                    { title: '角色服从', desc: '配合对方的角色扮演要求', probability: 5, icon: '🎭' },
                    { title: '身体展示', desc: '保持展示性姿势1分钟', probability: 6, icon: '🕴️' },
                    { title: '声音放大', desc: '被要求发出更大呻吟声', probability: 7, icon: '🔊' },
                    { title: '温度挑战', desc: '接受冰火交替的刺激体验', probability: 4, icon: '🌡️' },
                    { title: '束缚体验', desc: '接受轻微的手腕束缚1分钟', probability: 5, icon: '⛓️' },
                    { title: '深度开发', desc: '接受更深度的插入体验', probability: 4, icon: '🔍' },
                    { title: '多重刺激', desc: '同时接受多处敏感带刺激', probability: 5, icon: '🎯' },
                    { title: '节奏折磨', desc: '接受时快时慢的节奏变化', probability: 6, icon: '🎢' },
                    { title: '感官专注', desc: '只接受单一感官刺激2分钟', probability: 5, icon: '🎯' },
                    { title: '姿势挑战', desc: '尝试一个高难度性爱姿势', probability: 4, icon: '🤸' },
                    { title: '服务优先', desc: '优先满足对方性需求2分钟', probability: 6, icon: '🤲' },
                    { title: '言语服从', desc: '重复对方指定的挑逗话语', probability: 7, icon: '🗣️' },
                    { title: '禁声挑战', desc: '全程不能发出声音2分钟', probability: 4, icon: '🔇' },
                    { title: '反向控制', desc: '必须听从对方所有指令2分钟', probability: 4, icon: '🎛️' },
                    { title: '温度体验', desc: '接受冰块或温水在敏感带游走', probability: 5, icon: '❄️' },
                    { title: '束缚挑战', desc: '接受轻度束缚体验2分钟', probability: 4, icon: '🪢' },
                    { title: '节奏限制', desc: '只能使用最慢的节奏运动', probability: 5, icon: '🐢' },
                    { title: '姿势限定', desc: '保持最费力的姿势1分钟', probability: 4, icon: '💪' },
                    { title: '工具服务', desc: '专用情趣玩具为对方服务2分钟', probability: 5, icon: '🎁' },
                    { title: '镜前表演', desc: '在镜子前完成指定动作1分钟', probability: 6, icon: '🪞' },
                    { title: '声音模仿', desc: '模仿对方喜欢的声音2分钟', probability: 5, icon: '🎤' },
                    { title: '舞蹈惩罚', desc: '进行30秒性感舞蹈挑逗', probability: 7, icon: '💃' },
                    { title: '亲吻服务', desc: '亲吻对方指定部位1分钟', probability: 6, icon: '💋' },
                    { title: '按摩义务', desc: '为对方进行全身按摩2分钟', probability: 5, icon: '💆' },
                    { title: '情话挑战', desc: '不间断说情话1分钟', probability: 7, icon: '💬' },
                    { title: '表情管理', desc: '保持指定表情2分钟', probability: 5, icon: '😈' },
                    { title: '动作重复', desc: '重复最累的动作1分钟', probability: 4, icon: '🔁' },
                    { title: '感官超载', desc: '接受多重同时刺激1分钟', probability: 5, icon: '⚡' },
                    { title: '位置服务', desc: '在劣势位置服务对方2分钟', probability: 5, icon: '🛏️' },
                    { title: '深度挑战', desc: '接受最大深度的10次冲击', probability: 4, icon: '🔽' },
                    { title: '角度适应', desc: '适应最不舒服的角度1分钟', probability: 5, icon: '📐' },
                    { title: '暂停忍耐', desc: '在兴奋时静止不动30秒', probability: 4, icon: '🚦' },
                    { title: '工具体验', desc: '体验不熟悉的情趣玩具', probability: 5, icon: '🎁' },
                    { title: '环境适应', desc: '在较亮光线或特定地点进行', probability: 6, icon: '💡' },
                    { title: '声音解放', desc: '被要求放大声音回应', probability: 5, icon: '📢' },
                    { title: '表情释放', desc: '被要求展现最真实的表情', probability: 6, icon: '😫' },
                    { title: '终局服从', desc: '由对方决定高潮时机', probability: 4, icon: '🏁' },
                    { title: '羞耻姿势', desc: '摆出羞耻的姿势保持1分钟', probability: 7, icon: '🦶' },
                    { title: '敏感带暴露', desc: '最敏感部位被专注刺激2分钟', probability: 6, icon: '🎯' },
                    { title: '特殊叫床', desc: '按要求发出特定声音或话语', probability: 5, icon: '📢' },
                    { title: '冰火体验', desc: '用冰块和温水交替刺激敏感部位', probability: 4, icon: '❄️' },
                    { title: '束缚挑战', desc: '双手被缚接受爱抚2分钟', probability: 3, icon: '🎗️' },
                    { title: '反向服务', desc: '专注为对方服务2分钟不能求欢', probability: 6, icon: '🛎️' },
                    { title: '特殊道具', desc: '接受情趣玩具的特殊刺激', probability: 5, icon: '🎁' },
                    { title: '姿势维持', desc: '保持疲劳姿势直到对方允许放松', probability: 4, icon: '⏱️' },
                    { title: '边缘控制', desc: '被控制在快要高潮的状态1分钟', probability: 4, icon: '🎢' },
                    { title: '羞耻称呼', desc: '被用羞耻的称呼全程叫唤', probability: 7, icon: '🏷️' },
                    { title: '敏感测试', desc: '全身敏感点被逐一测试刺激', probability: 6, icon: '🧪' },
                    { title: '节奏被打乱', desc: '性爱节奏被故意打乱和重启', probability: 5, icon: '🔀' },
                    { title: '特殊要求', desc: '必须完成对方提出的特殊要求', probability: 4, icon: '📝' },
                    { title: '强度挑战', desc: '接受超出承受范围的刺激强度', probability: 3, icon: '💥' },
                    { title: '羞耻展示', desc: '必须展示自己最羞耻的一面', probability: 5, icon: '🪞' },
                    { title: '被动承受', desc: '完全被动地承受对方的所有动作', probability: 6, icon: '🛌' },
                    { title: '快速转换', desc: '在不同刺激方式间快速切换', probability: 5, icon: '🔄' },
                    { title: '特殊环境', desc: '在特别设置的环境中进行', probability: 4, icon: '🌌' },
                    { title: '言语羞辱', desc: '接受轻微的言语羞辱和调教', probability: 3, icon: '💬' },
                    { title: '服务优先', desc: '必须优先满足对方的所有需求', probability: 6, icon: '👑' },
                    { title: '耐力测试', desc: '测试在强烈刺激下的忍耐力', probability: 5, icon: '🛡️' },
                    { title: '创意惩罚', desc: '接受对方即兴发明的惩罚方式', probability: 4, icon: '💡' },
                    { title: '时间延长', desc: '性爱时间被强制延长', probability: 5, icon: '📅' },
                    { title: '全面服从', desc: '完全服从对方的支配和控制', probability: 3, icon: '🎮' }
                ]
            },
            {
                name: "支配与调教",
                rewards: [
                    { title: '轻咬特权', desc: '可在对方脖颈处轻咬留下痕迹', probability: 7, icon: '😈' },
                    { title: '轻咬耳垂', desc: '轻轻咬住对方耳垂20秒', probability: 8, icon: '👂' },
                    { title: '颈间吻痕', desc: '在对方颈部留下一个吻痕', probability: 7, icon: '💋' },
                    { title: '掌掴许可', desc: '可轻拍对方脸颊三下', probability: 6, icon: '✋' },
                    { title: '束缚手腕', desc: '用领带束缚对方手腕1分钟', probability: 5, icon: '🧣' },
                    { title: '丝绸束缚', desc: '用丝绸束缚脚踝30秒', probability: 6, icon: '🎀' },
                    { title: '蒙眼支配', desc: '蒙住对方眼睛进行触摸探索', probability: 6, icon: '👁️' },
                    { title: '项圈佩戴', desc: '为对方佩戴装饰项圈', probability: 4, icon: '⛓️' },
                    { title: '膝上惩罚', desc: '让对方趴在膝上轻拍臀部', probability: 5, icon: '🦵' },
                    { title: '轻拍臀部', desc: '轻拍对方臀部10下', probability: 9, icon: '👋' },
                    { title: '口头羞辱', desc: '可说三句轻度羞辱性爱称', probability: 6, icon: '🗣️' },
                    { title: '耳畔低语', desc: '在对方耳边说挑逗话语', probability: 8, icon: '🗣️' },
                    { title: '姿势控制', desc: '指定对方保持某个羞耻姿势', probability: 5, icon: '🧍' },
                    { title: '温度游戏', desc: '用冰块在对方皮肤上游走', probability: 4, icon: '❄️' },
                    { title: '冰块挑逗', desc: '用冰块在敏感部位滑动', probability: 5, icon: '❄️' },
                    { title: '蜡烛滴落', desc: '用低温蜡烛滴在对方背部', probability: 3, icon: '🕯️' },
                    { title: '蜡烛滴蜡', desc: '在安全部位滴蜡3滴', probability: 3, icon: '🕯️' },
                    { title: '夹子游戏', desc: '在对方胸部使用晾衣夹', probability: 3, icon: '📎' },
                    { title: '乳夹使用', desc: '使用衣物夹轻轻夹住敏感部位', probability: 4, icon: '📎' },
                    { title: '鞭打特权', desc: '用软鞭轻抽对方大腿三下', probability: 2, icon: '🐍' },
                    { title: '轻鞭体验', desc: '用软鞭轻扫背部3下', probability: 4, icon: '🐎' },
                    { title: '犬式爬行', desc: '令对方模仿犬类爬行一圈', probability: 4, icon: '🐕' },
                    { title: '宠物扮演', desc: '扮演宠物爬行1分钟', probability: 5, icon: '🐕' },
                    { title: '足底服务', desc: '让对方用舌头清洁你的足底', probability: 3, icon: '🦶' },
                    { title: '人体座椅', desc: '将对方作为座椅使用1分钟', probability: 4, icon: '💺' },
                    { title: '口塞体验', desc: '让对方佩戴口塞球2分钟', probability: 3, icon: '🔇' },
                    { title: '口球尝试', desc: '尝试佩戴口球30秒', probability: 3, icon: '🔇' },
                    { title: '拘束体验', desc: '将对方手脚束缚在床脚', probability: 2, icon: '🛏️' },
                    { title: '绳索束缚', desc: '用软绳轻轻束缚手臂', probability: 3, icon: '🪢' },
                    { title: '标记特权', desc: '用马克笔在对方身上作标记', probability: 5, icon: '🖊️' },
                    { title: '舔舐惩罚', desc: '令对方舔舐你指定部位', probability: 4, icon: '👅' },
                    { title: '公开羞辱', desc: '让对方面向镜子自我批评', probability: 5, icon: '🪞' },
                    { title: '犬吠惩罚', desc: '令对方模仿犬吠三声', probability: 6, icon: '🐶' },
                    { title: '肉体展示', desc: '令对方展示身体接受检视', probability: 5, icon: '🔍' },
                    { title: '侍奉更衣', desc: '让对方跪着为你更换衣物', probability: 4, icon: '👔' },
                    { title: '人体脚垫', desc: '将对方作为脚垫使用1分钟', probability: 3, icon: '🧎' },
                    { title: '跪姿服务', desc: '要求对方跪姿服务1分钟', probability: 5, icon: '🧎' },
                    { title: '唾液羞辱', desc: '允许将唾液滴在对方脸上', probability: 2, icon: '💧' },
                    { title: '厕所侍奉', desc: '令对方跪侍卫生间1分钟', probability: 3, icon: '🚽' },
                    { title: '笼中体验', desc: '令对方在笼状空间内蜷缩', probability: 2, icon: '🐇' },
                    { title: '监禁游戏', desc: '在衣柜体验短暂监禁', probability: 3, icon: '🚪' },
                    { title: '穿刺体验', desc: '用安全别针轻刺皮肤表面', probability: 1, icon: '📌' },
                    { title: '针刺体验', desc: '使用安全针轻微刺激', probability: 2, icon: '📌' },
                    { title: '窒息游戏', desc: '用手轻扼脖颈10秒', probability: 1, icon: '✋' },
                    { title: '窒息游戏', desc: '短暂轻捂口鼻15秒', probability: 2, icon: '🤭' },
                    { title: '公开自慰', desc: '令对方当着你面自慰1分钟', probability: 2, icon: '💦' },
                    { title: '电击体验', desc: '使用微电流玩具刺激', probability: 2, icon: '⚡' },
                    { title: '穿刺悬挂', desc: '体验临时性皮肤悬挂', probability: 1, icon: '🪝' },
                    { title: '吊缚尝试', desc: '尝试简易吊缚姿势', probability: 1, icon: '🕸️' },
                    { title: '公开暴露', desc: '在窗帘后暴露身体', probability: 3, icon: '🪟' },
                    { title: '公开调教', desc: '在窗边进行轻度调教', probability: 3, icon: '🪟' },
                    { title: '陌生人前', desc: '在陌生人可见处进行调教', probability: 2, icon: '👤' },
                    { title: '奴隶服务', desc: '要求对方全身心服务', probability: 4, icon: '🛎️' },
                    { title: '圣水游戏', desc: '尝试轻度圣水调教', probability: 1, icon: '💦' },
                    { title: '饮尿特权', desc: '令对方饮用你的尿液', probability: 1, icon: '🚰' },
                    { title: '黄金体验', desc: '令对方接触你的排泄物', probability: 1, icon: '💩' },
                    { title: '群交幻想', desc: '描述与他人性交的细节', probability: 2, icon: '👥' },
                    { title: '多人幻想', desc: '描述多人性爱场景', probability: 6, icon: '👥' },
                    { title: '淫语录制', desc: '录制对方求饶的语音', probability: 4, icon: '🎙️' },
                    { title: '淫照拍摄', desc: '拍摄对方羞耻部位照片', probability: 3, icon: '📸' },
                    { title: '露出体验', desc: '在安全环境轻度露出', probability: 3, icon: '🏞️' },
                    { title: '偷情幻想', desc: '扮演偷情场景', probability: 5, icon: '🕵️' },
                    { title: '强暴幻想', desc: '演绎强迫性爱场景', probability: 4, icon: '🎭' },
                    { title: '审讯场景', desc: '扮演审讯调教场景', probability: 4, icon: '💡' },
                    { title: '医疗扮演', desc: '扮演医生患者检查', probability: 5, icon: '🩺' },
                    { title: '师生游戏', desc: '扮演师生惩罚场景', probability: 4, icon: '📚' },
                    { title: '主奴契约', desc: '签订临时主奴协议', probability: 3, icon: '📝' }
                ],
                punishments: [
                    { title: '自缚体验', desc: '自行束缚双手5分钟', probability: 6, icon: '🤲' },
                    { title: '自缚表演', desc: '自己束缚双手1分钟', probability: 6, icon: '🤲' },
                    { title: '自我掌掴', desc: '自行掌掴脸部五下', probability: 5, icon: '👋' },
                    { title: '跪姿反省', desc: '保持跪姿反省2分钟', probability: 7, icon: '🧎' },
                    { title: '跪姿惩罚', desc: '跪姿反省5分钟', probability: 5, icon: '🧎' },
                    { title: '舔足谢罪', desc: '舔舐对方足部表示歉意', probability: 4, icon: '🦶' },
                    { title: '舔脚惩罚', desc: '舔对方脚底1分钟', probability: 4, icon: '🦶' },
                    { title: '肛塞体验', desc: '自行佩戴肛塞30分钟', probability: 3, icon: '🔌' },
                    { title: '肛塞体验', desc: '佩戴肛塞30分钟', probability: 4, icon: '🔌' },
                    { title: '乳头夹', desc: '自行佩戴乳头夹10分钟', probability: 3, icon: '📏' },
                    { title: '乳夹惩罚', desc: '佩戴乳夹15分钟', probability: 4, icon: '📎' },
                    { title: '阴蒂夹', desc: '自行佩戴阴蒂夹5分钟', probability: 2, icon: '🎯' },
                    { title: '自慰展示', desc: '当对方面自慰至高潮', probability: 4, icon: '💦' },
                    { title: '自慰展示', desc: '当对方面自慰1分钟', probability: 5, icon: '✊' },
                    { title: '饮精惩罚', desc: '饮用对方精液作为惩罚', probability: 2, icon: '🥛' },
                    { title: '潮吹挑战', desc: '尝试当对方面潮吹', probability: 3, icon: '🌊' },
                    { title: '深喉练习', desc: '练习深喉忍耐1分钟', probability: 3, icon: '👅' },
                    { title: '肛门开发', desc: '使用按摩棒开发后庭', probability: 2, icon: '🪠' },
                    { title: '肛门扩张', desc: '尝试肛门扩张练习', probability: 3, icon: '🕳️' },
                    { title: '双穴体验', desc: '同时开发前后两穴', probability: 2, icon: '↕️' },
                    { title: '舔肛惩罚', desc: '为对方舔肛1分钟', probability: 3, icon: '👅' },
                    { title: '口交服务', desc: '为对方口交5分钟', probability: 4, icon: '💋' },
                    { title: '肛交体验', desc: '接受肛交10分钟', probability: 3, icon: '🍑' },
                    { title: '饮尿惩罚', desc: '饮用自己的尿液', probability: 1, icon: '🚰' },
                    { title: '饮尿惩罚', desc: '饮用对方尿液一小口', probability: 1, icon: '🚽' },
                    { title: '粪便体验', desc: '接触自己的排泄物', probability: 1, icon: '💩' },
                    { title: '食粪体验', desc: '尝试食用少量粪便', probability: 1, icon: '💩' },
                    { title: '穿刺惩罚', desc: '接受临时穿刺装饰', probability: 2, icon: '📍' },
                    { title: '针刺惩罚', desc: '接受安全针刺体验', probability: 2, icon: '📌' },
                    { title: '鞭刑惩罚', desc: '接受鞭打20下', probability: 3, icon: '🐎' },
                    { title: '掌掴惩罚', desc: '接受掌掴10下', probability: 4, icon: '✋' },
                    { title: '电击惩罚', desc: '接受电击玩具惩罚', probability: 2, icon: '⚡' },
                    { title: '爬行惩罚', desc: '爬行绕房间一圈', probability: 6, icon: '🐕' },
                    { title: '公开自慰', desc: '在窗边自慰1分钟', probability: 3, icon: '🪟' },
                    { title: '户外暴露', desc: '在阳台短暂全裸', probability: 3, icon: '🏞️' }
                ]
            }
        ];

        // 新增：合作模式模板
        gameData.templates.coopMode = [
            {
                name: "亲密时光",
                rewards: [
                    { title: '深情拥抱', desc: '紧紧拥抱对方1分钟', probability: 10, icon: '🤗' },
                    { title: '甜蜜亲吻', desc: '浪漫接吻30秒', probability: 9, icon: '💋' },
                    { title: '额头轻吻', desc: '温柔亲吻对方额头', probability: 10, icon: '😘' },
                    { title: '背后拥抱', desc: '从背后环抱对方1分钟', probability: 8, icon: '👐' },
                    { title: '手牵手散步', desc: '牵手在房间漫步1分钟', probability: 9, icon: '👫' },
                    { title: '肩部按摩', desc: '为对方按摩肩膀2分钟', probability: 7, icon: '💆' },
                    { title: '梳头服务', desc: '温柔为对方梳头1分钟', probability: 8, icon: '💇' },
                    { title: '耳畔私语', desc: '在耳边说甜蜜情话', probability: 7, icon: '🗣️' },
                    { title: '公主抱体验', desc: '公主抱对方30秒', probability: 5, icon: '👸' },
                    { title: '膝枕时光', desc: '享受膝枕1分钟', probability: 6, icon: '🛋️' },
                    { title: '暖手服务', desc: '为对方暖手1分钟', probability: 8, icon: '🤲' },
                    { title: '爱的凝视', desc: '深情对视1分钟不笑场', probability: 6, icon: '👀' },
                    { title: '甜蜜喂食', desc: '喂对方吃一口零食', probability: 9, icon: '🍓' },
                    { title: '情歌献唱', desc: '为对方唱一段情歌', probability: 5, icon: '🎤' },
                    { title: '舞蹈时刻', desc: '相拥慢舞1分钟', probability: 6, icon: '💃' },
                    { title: '挠痒痒游戏', desc: '轻轻挠痒痒30秒', probability: 8, icon: '😄' },
                    { title: '捏肩服务', desc: '为对方捏肩2分钟', probability: 7, icon: '💪' },
                    { title: '脚部按摩', desc: '为对方按摩脚底1分钟', probability: 6, icon: '🦶' },
                    { title: '发型设计', desc: '为对方设计一个新发型', probability: 5, icon: '💁' },
                    { title: '爱的宣言', desc: '说出爱对方的三个理由', probability: 8, icon: '💖' },
                    { title: '回忆重温', desc: '分享一个甜蜜回忆', probability: 7, icon: '📖' },
                    { title: '未来憧憬', desc: '描述一个共同梦想', probability: 6, icon: '🔮' },
                    { title: '拍照时刻', desc: '拍一张甜蜜合照', probability: 9, icon: '📸' },
                    { title: '赞美风暴', desc: '连续赞美对方1分钟', probability: 7, icon: '🌟' },
                    { title: '护手霜服务', desc: '为对方涂护手霜', probability: 8, icon: '🧴' },
                    { title: '系鞋带服务', desc: '为对方系鞋带', probability: 9, icon: '👟' },
                    { title: '整理衣领', desc: '为对方整理衣领', probability: 8, icon: '👔' },
                    { title: '读书时光', desc: '为对方朗读一段文字', probability: 6, icon: '📚' },
                    { title: '绘画时间', desc: '为对方画一幅简笔画', probability: 5, icon: '🎨' },
                    { title: '音乐分享', desc: '分享一首有意义的歌', probability: 7, icon: '🎵' },
                    { title: '静默相伴', desc: '安静依偎1分钟', probability: 8, icon: '🤫' },
                    { title: '惊喜预告', desc: '预告一个小惊喜', probability: 6, icon: '🎁' },
                    { title: '感谢表达', desc: '感谢对方做的三件事', probability: 7, icon: '🙏' },
                    { title: '道歉时刻', desc: '为小事真诚道歉', probability: 6, icon: '😔' },
                    { title: '鼓励话语', desc: '说鼓励对方的话', probability: 8, icon: '💫' },
                    { title: '秘密分享', desc: '分享一个小秘密', probability: 5, icon: '🤫' },
                    { title: '梦想支持', desc: '表达支持对方梦想', probability: 7, icon: '🚀' },
                    { title: '品质赞美', desc: '赞美对方的一个品质', probability: 8, icon: '⭐' },
                    { title: '成长认可', desc: '认可对方的进步', probability: 7, icon: '📈' },
                    { title: '耐心展示', desc: '展示耐心倾听2分钟', probability: 6, icon: '🎧' },
                    { title: '理解表达', desc: '表达对对方的理解', probability: 7, icon: '💭' },
                    { title: '信任建立', desc: '做一件建立信任的事', probability: 6, icon: '🤝' },
                    { title: '浪漫氛围', desc: '创造浪漫环境1分钟', probability: 5, icon: '🎇' },
                    { title: '温柔触碰', desc: '温柔触摸对方脸庞', probability: 8, icon: '👐' },
                    { title: '发丝轻抚', desc: '轻抚对方头发1分钟', probability: 9, icon: '💇' },
                    { title: '背部轻划', desc: '在对方背上画圈1分钟', probability: 7, icon: '🌀' },
                    { title: '耳后亲吻', desc: '亲吻耳后敏感区域', probability: 6, icon: '👂' },
                    { title: '手背亲吻', desc: '亲吻对方手背', probability: 9, icon: '💋' },
                    { title: '颈部按摩', desc: '按摩对方颈部1分钟', probability: 7, icon: '💆' },
                    { title: '爱的暗号', desc: '创造一个爱的暗号', probability: 5, icon: '🤐' }
                ],
                punishments: [
                    { title: '鬼脸模仿', desc: '模仿对方做的鬼脸', probability: 8, icon: '🤪' },
                    { title: '动物叫声', desc: '学三种动物叫声', probability: 7, icon: '🐶' },
                    { title: '滑稽舞蹈', desc: '跳30秒滑稽舞蹈', probability: 6, icon: '🕺' },
                    { title: '倒念台词', desc: '倒着念一段经典台词', probability: 5, icon: '📜' },
                    { title: '表情包还原', desc: '还原一个经典表情包', probability: 7, icon: '🙈' },
                    { title: '儿歌新唱', desc: '用摇滚风唱儿歌', probability: 6, icon: '🎤' },
                    { title: '慢动作表演', desc: '用慢动作表演喝水', probability: 7, icon: '🐌' },
                    { title: '塑料英语', desc: '用塑料英语自我介绍', probability: 6, icon: '🔠' },
                    { title: '镜像模仿', desc: '即时模仿对方动作', probability: 5, icon: '🪞' },
                    { title: '夸张表情', desc: '做最夸张的表情', probability: 8, icon: '😱' },
                    { title: '单脚跳圈', desc: '单脚跳绕圈10次', probability: 6, icon: '⭕' },
                    { title: '蛙跳惩罚', desc: '蛙跳绕房间一圈', probability: 5, icon: '🐸' },
                    { title: '鸭子走路', desc: '鸭子走路10步', probability: 7, icon: '🦆' },
                    { title: '螃蟹横移', desc: '螃蟹式横移5米', probability: 6, icon: '🦀' },
                    { title: '转圈说话', desc: '转圈同时说话', probability: 5, icon: '🌀' },
                    { title: '闭眼走路', desc: '闭眼走直线5步', probability: 4, icon: '🙈' },
                    { title: '反向动作', desc: '做所有动作反向', probability: 5, icon: '↔️' },
                    { title: '快速转体', desc: '快速转体20次', probability: 6, icon: '🔄' },
                    { title: '单腿站立', desc: '单腿站立1分钟', probability: 7, icon: '🦵' },
                    { title: '平衡挑战', desc: '头顶书走路', probability: 5, icon: '📚' },
                    { title: '舌头打结', desc: '快速说绕口令', probability: 6, icon: '🗣️' },
                    { title: '憋气比赛', desc: '憋气30秒', probability: 4, icon: '🤐' },
                    { title: '倒立尝试', desc: '靠墙倒立尝试', probability: 3, icon: '🙃' },
                    { title: '柔韧测试', desc: '尝试劈叉或高抬腿', probability: 4, icon: '🤸' },
                    { title: '力量展示', desc: '做5个俯卧撑', probability: 5, icon: '💪' },
                    { title: '速度挑战', desc: '快速深蹲10次', probability: 6, icon: '⚡' },
                    { title: '协调测试', desc: '左手画圆右手画方', probability: 5, icon: '🎨' },
                    { title: '记忆挑战', desc: '背诵对方生日号码', probability: 7, icon: '🧠' },
                    { title: '反应测试', desc: '快速反应游戏', probability: 6, icon: '🎯' },
                    { title: '模仿挑战', desc: '模仿对方习惯动作', probability: 7, icon: '🎭' },
                    { title: '声音模仿', desc: '模仿对方说话声音', probability: 6, icon: '🎙️' },
                    { title: '走路姿势', desc: '模仿对方走路姿势', probability: 7, icon: '🚶' },
                    { title: '笑声模仿', desc: '模仿对方笑声', probability: 8, icon: '😂' },
                    { title: '表情模仿', desc: '模仿对方生气表情', probability: 6, icon: '😠' },
                    { title: '口头禅模仿', desc: '学对方口头禅', probability: 7, icon: '💬' },
                    { title: '拍照鬼脸', desc: '做鬼脸拍照留存', probability: 8, icon: '📸' },
                    { title: '视频录制', desc: '录制滑稽视频', probability: 6, icon: '🎥' },
                    { title: '社交分享', desc: '分享到社交平台', probability: 4, icon: '📱' },
                    { title: '亲友展示', desc: '展示给一位亲友', probability: 3, icon: '👨‍👩‍👧' },
                    { title: '群组分享', desc: '分享到亲友群', probability: 2, icon: '👥' },
                    { title: '公开表演', desc: '在窗边表演', probability: 5, icon: '🪟' },
                    { title: '邻居互动', desc: '与邻居打招呼', probability: 4, icon: '🏠' },
                    { title: '楼道表演', desc: '在楼道表演节目', probability: 3, icon: '🚪' },
                    { title: '电梯表演', desc: '在电梯里唱歌', probability: 2, icon: '🛗' },
                    { title: '阳台展示', desc: '在阳台挥手', probability: 4, icon: '🏞️' },
                    { title: '窗口互动', desc: '在窗口与人互动', probability: 3, icon: '🪟' },
                    { title: '公共区域', desc: '在公共区域表演', probability: 2, icon: '🏢' },
                    { title: '录音留存', desc: '录音保存1年', probability: 5, icon: '🎙️' },
                    { title: '照片保存', desc: '照片保存为屏保', probability: 6, icon: '📱' },
                    { title: '视频收藏', desc: '视频收藏1个月', probability: 4, icon: '💾' },
                    { title: '记忆永存', desc: '成为永久回忆', probability: 3, icon: '📝' }
                ]
            },
            {
                name: "情侣运动挑战",
                rewards: [
                    { title: '深蹲减半券', desc: '下一组深蹲次数减少50%', probability: 6, icon: '🦵' },
                    { title: '平板支撑时间减免', desc: '平板支撑时间减少30秒', probability: 5, icon: '⏱️' },
                    { title: '仰卧起坐跳过卡', desc: '可跳过一轮仰卧起坐训练', probability: 7, icon: '📉' },
                    { title: '波比跳替换权', desc: '将波比跳替换为开合跳', probability: 4, icon: '🔄' },
                    { title: '双人协作特权', desc: '选择一项双人协作运动项目', probability: 6, icon: '👫' },
                    { title: '音乐选择权', desc: '选择运动时的背景音乐', probability: 8, icon: '🎵' },
                    { title: '休息时间加倍', desc: '组间休息时间延长1分钟', probability: 7, icon: '🛋️' },
                    { title: '计数监督权', desc: '由你为对方计数和监督动作', probability: 5, icon: '👀' },
                    { title: '拉伸主导权', desc: '由你带领进行运动后拉伸', probability: 6, icon: '🧘' },
                    { title: '即刻休息券', desc: '立即休息2分钟', probability: 4, icon: '⏸️' },
                    { title: '动作创新权', desc: '可自创一个双人运动动作', probability: 5, icon: '💡' },
                    { title: '按摩特权', desc: '运动后获得对方2分钟按摩', probability: 4, icon: '💆' },
                    { title: '运动顺序调整', desc: '调整今日运动项目顺序', probability: 7, icon: '📋' },
                    { title: '强度降级权', desc: '将高强度运动降为中等强度', probability: 6, icon: '🔽' },
                    { title: '次数冻结权', desc: '本轮运动次数不再增加', probability: 5, icon: '❄️' },
                    { title: '双人深蹲优惠', desc: '双人深蹲次数打八折', probability: 6, icon: '8️⃣' },
                    { title: '平衡训练豁免', desc: '可跳过单脚平衡训练', probability: 7, icon: '⚖️' },
                    { title: '高抬腿替换', desc: '将高抬腿替换为原地小跑', probability: 6, icon: '🔄' },
                    { title: '俯卧撑降级', desc: '跪姿俯卧撑代替标准俯卧撑', probability: 5, icon: '📉' },
                    { title: '有氧运动选择', desc: '选择喜欢的有氧运动方式', probability: 7, icon: '💓' },
                    { title: '运动场地决定', desc: '选择今日运动的地点', probability: 6, icon: '📍' },
                    { title: '搭档辅助权', desc: '要求对方辅助完成困难动作', probability: 5, icon: '🤝' },
                    { title: '运动时长控制', desc: '微调本次运动总时长', probability: 6, icon: '⏰' },
                    { title: '双人瑜伽主导', desc: '选择双人瑜伽的体式', probability: 5, icon: '🧘' },
                    { title: '核心训练减免', desc: '核心训练时间减少1分钟', probability: 6, icon: '💪' },
                    { title: '跳跃运动跳过', desc: '跳过所有跳跃类运动', probability: 4, icon: '🚫' },
                    { title: '拉伸时间延长', desc: '运动后拉伸增加2分钟', probability: 7, icon: '🤸' },
                    { title: '运动装备优先', desc: '优先使用舒适的运动装备', probability: 8, icon: '👟' },
                    { title: '降温特权', desc: '优先使用风扇或空调', probability: 7, icon: '❄️' },
                    { title: '补水休息', desc: '额外获得30秒喝水时间', probability: 9, icon: '💧' },
                    { title: '运动间隔延长', desc: '组间间隔延长30秒', probability: 6, icon: '🕒' },
                    { title: '轻量级选择', desc: '选择较轻的重量训练', probability: 5, icon: '🏋️' },
                    { title: '运动节奏控制', desc: '控制运动节奏的快慢', probability: 6, icon: '🎚️' },
                    { title: '双人竞赛豁免', desc: '免于参加双人竞赛项目', probability: 5, icon: '🚫' },
                    { title: '胜利庆祝', desc: '完成后获得对方拥抱庆祝', probability: 8, icon: '🎉' },
                    { title: '明日预支休息', desc: '预支明天5分钟运动休息', probability: 4, icon: '📅' },
                    { title: '运动成就奖', desc: '获得"运动达人"称号', probability: 7, icon: '🏆' },
                    { title: '双人协调奖', desc: '获得"最佳搭档"荣誉', probability: 6, icon: '👏' },
                    { title: '进步最快奖', desc: '获得进步认可和鼓励', probability: 8, icon: '📈' },
                    { title: '坚持不懈奖', desc: '获得坚持运动的表扬', probability: 9, icon: '🌟' },
                    { title: '动作标准奖', desc: '获得动作标准的认可', probability: 7, icon: '✅' },
                    { title: '能量补充', desc: '运动后获得健康小零食', probability: 8, icon: '🍎' },
                    { title: '音乐DJ权', desc: '完全控制运动音乐播放', probability: 6, icon: '🎧' },
                    { title: '灯光调节权', desc: '调节运动环境的灯光', probability: 7, icon: '💡' },
                    { title: '空间布置权', desc: '布置运动空间的环境', probability: 5, icon: '🛋️' },
                    { title: '运动服装选择', desc: '为对方选择运动服装', probability: 6, icon: '👕' },
                    { title: '双人自拍时刻', desc: '拍摄运动中的双人照片', probability: 9, icon: '🤳' },
                    { title: '运动记录权', desc: '记录本次运动的数据', probability: 7, icon: '📊' },
                    { title: '挑战设定权', desc: '设定下一个运动挑战', probability: 5, icon: '🎯' },
                    { title: '运动心得分享', desc: '分享运动感受和经验', probability: 8, icon: '💬' }
                ],
                punishments: [
                    { title: '双倍深蹲挑战', desc: '完成双倍数量的深蹲', probability: 4, icon: '2️⃣' },
                    { title: '延长平板支撑', desc: '平板支撑增加30秒', probability: 5, icon: '⏱️' },
                    { title: '波比跳加量', desc: '额外增加5个波比跳', probability: 4, icon: '➕' },
                    { title: '单腿深蹲挑战', desc: '每侧完成5个单腿深蹲', probability: 3, icon: '🦵' },
                    { title: '登山式加速', desc: '加快速度完成登山式30秒', probability: 5, icon: '⛰️' },
                    { title: '高抬腿极限', desc: '高抬腿速度提升至最快', probability: 6, icon: '💨' },
                    { title: '仰卧起坐加速', desc: '用最快速度完成仰卧起坐', probability: 5, icon: '⚡' },
                    { title: '俯卧撑挑战', desc: '完成标准俯卧撑10个', probability: 4, icon: '💪' },
                    { title: '开合跳加倍', desc: '开合跳次数增加50%', probability: 5, icon: '🔄' },
                    { title: '弓步蹲加量', desc: '每侧增加3个弓步蹲', probability: 4, icon: '👣' },
                    { title: '俄罗斯转体延长', desc: '俄罗斯转体增加30秒', probability: 5, icon: '🔄' },
                    { title: '靠墙静蹲加时', desc: '靠墙静蹲增加30秒', probability: 4, icon: '🧱' },
                    { title: '跳跃弓步挑战', desc: '完成跳跃弓步蹲8次', probability: 3, icon: '💥' },
                    { title: '熊爬前进', desc: '熊爬姿势前进5米', probability: 5, icon: '🐻' },
                    { title: '螃蟹走路', desc: '螃蟹式横移10米', probability: 6, icon: '🦀' },
                    { title: '蛙跳惩罚', desc: '蛙跳绕房间一圈', probability: 5, icon: '🐸' },
                    { title: '鸭步行走', desc: '深蹲鸭步行走10步', probability: 6, icon: '🦆' },
                    { title: '快速踮脚', desc: '快速踮脚50次', probability: 7, icon: '👣' },
                    { title: '闭眼平衡挑战', desc: '闭眼单脚站立1分钟', probability: 5, icon: '🙈' },
                    { title: '左右跳障碍', desc: '左右跳过一件物品20次', probability: 5, icon: '🔄' },
                    { title: '单脚跳圈', desc: '单脚跳绕小圈10次', probability: 6, icon: '⭕' },
                    { title: '弯腰触趾跳', desc: '跳跃中弯腰触脚趾10次', probability: 5, icon: '🦶' },
                    { title: '快速转体', desc: '快速左右转体30次', probability: 6, icon: '🌀' },
                    { title: '举手深蹲', desc: '深蹲时双手举过头顶', probability: 5, icon: '🙌' },
                    { title: '交叉登山式', desc: '做交叉登山式20次', probability: 4, icon: '❌' },
                    { title: '跳跃拍膝', desc: '跳跃中双膝相碰8次', probability: 5, icon: '🦵' },
                    { title: '快速摆臂', desc: '快速摆臂运动1分钟', probability: 7, icon: '💪' },
                    { title: '单腿平衡触地', desc: '单腿站立弯腰触地5次', probability: 4, icon: '📥' },
                    { title: '连续蹲跳', desc: '连续蹲跳15次不休息', probability: 5, icon: '⚡' },
                    { title: '宽距俯卧撑', desc: '做宽距俯卧撑5个', probability: 4, icon: '↔️' },
                    { title: '下斜俯卧撑', desc: '脚抬高的俯卧撑3个', probability: 3, icon: '📐' },
                    { title: '爆发力俯卧撑', desc: '爆发式俯卧撑5个', probability: 2, icon: '💥' },
                    { title: '双人深蹲挑战', desc: '背靠背双人深蹲10次', probability: 6, icon: '👫' },
                    { title: '面对面俯卧撑', desc: '面对面击掌俯卧撑5次', probability: 4, icon: '✋' },
                    { title: '双人平板击掌', desc: '平板支撑姿势击掌10次', probability: 5, icon: '🖐️' },
                    { title: '协作仰卧起坐', desc: '双人协作仰卧起坐8次', probability: 5, icon: '🤝' },
                    { title: '信任深蹲', desc: '闭眼信任深蹲5次', probability: 4, icon: '🙈' },
                    { title: '同步开合跳', desc: '完全同步开合跳20次', probability: 6, icon: '🔄' },
                    { title: '双人平衡挑战', desc: '单脚站立互扶30秒', probability: 5, icon: '⚖️' },
                    { title: '协作波比跳', desc: '双人配合波比跳5次', probability: 3, icon: '👥' },
                    { title: '镜像运动', desc: '即时模仿对方动作1分钟', probability: 6, icon: '🪞' },
                    { title: '节奏跟随', desc: '跟随对方运动节奏1分钟', probability: 5, icon: '🎵' },
                    { title: '力量对抗', desc: '进行等长力量对抗30秒', probability: 4, icon: '⚔️' },
                    { title: '柔韧挑战', desc: '尝试新的拉伸动作', probability: 5, icon: '🤸' },
                    { title: '协调性测试', desc: '完成复杂协调动作', probability: 4, icon: '🎪' },
                    { title: '反应速度训练', desc: '快速反应运动30秒', probability: 6, icon: '🚦' },
                    { title: '耐力挑战', desc: '持续运动不休息1分钟', probability: 5, icon: '🔋' },
                    { title: '爆发力测试', desc: '最大力量爆发运动', probability: 4, icon: '💥' },
                    { title: '灵活性竞赛', desc: '柔韧性比拼1分钟', probability: 5, icon: '🎯' },
                    { title: '平衡力对决', desc: '单脚站立持久战', probability: 6, icon: '⚖️' }
                ]
            },
            {
                name: "情欲双人挑战",
                rewards: [
                    { title: '默契深吻', desc: '两人同时闭眼深吻30秒，保持绝对同步', probability: 4, icon: '💋' },
                    { title: '镜像脱衣', desc: '面对面同步脱掉对方一件衣物', probability: 3, icon: '👕' },
                    { title: '体温传递', desc: '赤裸相拥，用体温温暖对方1分钟', probability: 5, icon: '🫂' },
                    { title: '同步爱抚', desc: '同时为对方按摩敏感部位30秒', probability: 4, icon: '✋' },
                    { title: '呼吸交融', desc: '鼻尖相触，同步呼吸1分钟', probability: 6, icon: '🌬️' },
                    { title: '舌尖探戈', desc: '闭眼用舌尖探索对方唇齿20秒', probability: 4, icon: '👅' },
                    { title: '耳语密语', desc: '同时在对方案头说情话30秒', probability: 7, icon: '🗣️' },
                    { title: '心跳共鸣', desc: '赤裸相拥，感受对方心跳1分钟', probability: 5, icon: '💓' },
                    { title: '同步高潮', desc: '同时为对方带来愉悦的30秒', probability: 3, icon: '⚡' },
                    { title: '肌肤相亲', desc: '褪去上衣相拥，感受肌肤之亲', probability: 4, icon: '🌟' },
                    { title: '唾液交换', desc: '用嘴对嘴的方式分享一口饮品', probability: 5, icon: '🥤' },
                    { title: '情欲对视', desc: '充满欲望地对视1分钟不许笑', probability: 6, icon: '🔥' },
                    { title: '同步爱痕', desc: '在对方相同位置留下吻痕', probability: 4, icon: '💋' },
                    { title: '敏感探索', desc: '同时探索对方最敏感的部位', probability: 3, icon: '🎯' },
                    { title: '欲望低语', desc: '在耳边诉说最露骨的欲望', probability: 5, icon: '👂' },
                    { title: '同步前戏', desc: '为对方进行30秒的情趣前戏', probability: 4, icon: '🎭' },
                    { title: '情欲舞蹈', desc: '贴身慢舞，感受对方身体曲线', probability: 5, icon: '💃' },
                    { title: '感官剥夺', desc: '蒙眼通过触摸识别对方身体', probability: 4, icon: '👁️' },
                    { title: '温度游戏', desc: '用冰块在对方身上画圈', probability: 5, icon: '❄️' },
                    { title: '束缚体验', desc: '轻轻绑住对方手腕30秒', probability: 4, icon: '🎀' },
                    { title: '权力交换', desc: '一人主导，一人服从2分钟', probability: 5, icon: '👑' },
                    { title: '角色扮演', desc: '扮演医生患者进行"检查"', probability: 6, icon: '🥼' },
                    { title: '感官专注', desc: '只用一个手指爱抚对方全身', probability: 5, icon: '☝️' },
                    { title: '欲望绘画', desc: '用口红在对方身上作画', probability: 6, icon: '💄' },
                    { title: '同步呻吟', desc: '同时发出愉悦的声音30秒', probability: 5, icon: '🎵' },
                    { title: '情欲摄影', desc: '为对方拍摄性感照片3张', probability: 6, icon: '📸' },
                    { title: '欲望书写', desc: '在对方背上写下露骨情话', probability: 5, icon: '✍️' },
                    { title: '同步挑逗', desc: '同时挑逗对方最敏感地带', probability: 4, icon: '🎪' },
                    { title: '情欲模仿', desc: '模仿色情片片段30秒', probability: 5, icon: '🎬' },
                    { title: '同步高潮', desc: '尝试同时达到生理高潮', probability: 2, icon: '🎆' },
                    { title: '性幻想分享', desc: '分享最露骨的性幻想', probability: 4, icon: '🌌' },
                    { title: '欲望清单', desc: '列出最想尝试的性爱姿势', probability: 5, icon: '📝' },
                    { title: '敏感地图', desc: '在对方身上标记敏感区域', probability: 4, icon: '🗺️' },
                    { title: '情欲密码', desc: '创造专属的性暗示暗号', probability: 6, icon: '🔐' },
                    { title: '同步喘息', desc: '模仿做爱时的喘息1分钟', probability: 5, icon: '💨' },
                    { title: '欲望之舞', desc: '跳一段充满性暗示的舞蹈', probability: 6, icon: '🕺' },
                    { title: '情欲美食', desc: '用食物互相喂食挑逗', probability: 7, icon: '🍓' },
                    { title: '同步更衣', desc: '帮对方换上情趣内衣', probability: 5, icon: '👙' },
                    { title: '欲望测量', desc: '测量对方兴奋时的生理变化', probability: 4, icon: '📏' },
                    { title: '情欲日记', desc: '记录此刻的欲望感受', probability: 6, icon: '📓' },
                    { title: '同步沐浴', desc: '一起进入浴室亲密接触', probability: 3, icon: '🚿' },
                    { title: '欲望录音', desc: '录下对方愉悦的声音', probability: 5, icon: '🎙️' },
                    { title: '情欲雕塑', desc: '摆出性感雕塑姿势30秒', probability: 6, icon: '🗿' },
                    { title: '同步爱语', desc: '同时说出最露骨的情话', probability: 5, icon: '💬' },
                    { title: '欲望温度', desc: '测量对方皮肤温度变化', probability: 4, icon: '🌡️' },
                    { title: '情欲镜像', desc: '模仿对方的性感动作', probability: 6, icon: '🪞' },
                    { title: '同步爱抚', desc: '用相同节奏爱抚对方', probability: 5, icon: '🎵' },
                    { title: '欲望实验', desc: '尝试新的敏感点探索', probability: 4, icon: '🧪' },
                    { title: '情欲拼图', desc: '用身体拼出亲密姿势', probability: 5, icon: '🧩' },
                    { title: '同步解放', desc: '同时解放身体的束缚', probability: 4, icon: '🔓' }
                ],
                punishments: [
                    { title: '公开调情', desc: '在窗边公开亲吻爱抚1分钟', probability: 3, icon: '🪟' },
                    { title: '情趣服装', desc: '穿上最性感的内衣跳舞', probability: 4, icon: '👙' },
                    { title: '欲望告白', desc: '大声说出最羞耻的性幻想', probability: 2, icon: '📢' },
                    { title: '性感走秀', desc: '在房间进行内衣走秀', probability: 5, icon: '🌟' },
                    { title: '情欲模仿', desc: '模仿色情明星的经典动作', probability: 4, icon: '🎭' },
                    { title: '敏感展示', desc: '向对方展示最敏感部位', probability: 3, icon: '🎯' },
                    { title: '欲望服务', desc: '为对方进行全身精油按摩', probability: 5, icon: '💆' },
                    { title: '情欲赌注', desc: '输者脱一件衣物', probability: 6, icon: '🎲' },
                    { title: '性感直播', desc: '假装在直播平台表演', probability: 4, icon: '📱' },
                    { title: '欲望挑战', desc: '尝试最羞耻的性爱姿势', probability: 3, icon: '🎪' },
                    { title: '情欲采访', desc: '接受对方露骨的性爱采访', probability: 5, icon: '🎤' },
                    { title: '性感健身', desc: '做性感版的健身动作', probability: 6, icon: '🏋️' },
                    { title: '欲望绘画', desc: '在对方身上画性感图案', probability: 5, icon: '🎨' },
                    { title: '情欲教学', desc: '教对方最擅长的调情技巧', probability: 4, icon: '👨‍🏫' },
                    { title: '性感清洁', desc: '穿内衣进行家务劳动', probability: 6, icon: '🧹' },
                    { title: '欲望录音', desc: '录制露骨的语音消息', probability: 4, icon: '🎙️' },
                    { title: '情欲测验', desc: '回答羞耻的性知识问题', probability: 5, icon: '📝' },
                    { title: '性感瑜伽', desc: '做双人性感瑜伽姿势', probability: 4, icon: '🧘' },
                    { title: '欲望购物', desc: '一起浏览情趣用品网站', probability: 7, icon: '🛒' },
                    { title: '情欲料理', desc: '用身体部位喂食水果', probability: 5, icon: '🍌' },
                    { title: '性感阅读', desc: '朗读情色小说片段', probability: 6, icon: '📖' },
                    { title: '欲望游戏', desc: '玩脱衣骰子游戏', probability: 5, icon: '🎲' },
                    { title: '情欲电影', desc: '一起观看情色电影片段', probability: 6, icon: '🎬' },
                    { title: '性感摄影', desc: '拍摄亲密合照3张', probability: 5, icon: '📸' },
                    { title: '欲望写作', desc: '写一段露骨的情色文字', probability: 4, icon: '✍️' },
                    { title: '情欲猜谜', desc: '猜对方身上的敏感点', probability: 5, icon: '❓' },
                    { title: '性感运动', desc: '做双人亲密运动', probability: 4, icon: '🤸' },
                    { title: '欲望测量', desc: '测量对方的性感部位', probability: 5, icon: '📐' },
                    { title: '情欲拼图', desc: '拼出裸体艺术拼图', probability: 6, icon: '🧩' },
                    { title: '性感音乐', desc: '跟着情色音乐跳舞', probability: 7, icon: '🎵' },
                    { title: '欲望实验', desc: '尝试新的调情方法', probability: 5, icon: '🧪' },
                    { title: '情欲旅行', desc: '描述想象中的性爱旅行', probability: 6, icon: '✈️' },
                    { title: '性感烹饪', desc: '穿围裙做性感烹饪', probability: 5, icon: '👩‍🍳' },
                    { title: '欲望天气', desc: '用身体表达情欲天气', probability: 4, icon: '🌧️' },
                    { title: '情欲星座', desc: '解读对方的性爱星座', probability: 6, icon: '♏' },
                    { title: '性感数学', desc: '用身体表示情欲数字', probability: 5, icon: '🔢' },
                    { title: '欲望地理', desc: '在对方身上探索情欲地图', probability: 4, icon: '🗺️' },
                    { title: '情欲历史', desc: '讲述双方的性爱历史', probability: 3, icon: '📜' },
                    { title: '性感科学', desc: '用科学术语描述性爱', probability: 5, icon: '🔬' },
                    { title: '欲望艺术', desc: '用身体摆出艺术姿势', probability: 6, icon: '🎨' },
                    { title: '情欲诗歌', desc: '创作露骨的情色诗歌', probability: 4, icon: '📜' },
                    { title: '性感建筑', desc: '用身体搭建亲密建筑', probability: 5, icon: '🏛️' },
                    { title: '欲望经济', desc: '讨论性爱的供需关系', probability: 4, icon: '💹' },
                    { title: '情欲政治', desc: '制定卧室法律法规', probability: 5, icon: '⚖️' },
                    { title: '性感生物', desc: '模仿动物求偶行为', probability: 6, icon: '🐾' },
                    { title: '欲望物理', desc: '解释性爱的力学原理', probability: 4, icon: '⚛️' },
                    { title: '情欲化学', desc: '描述性爱的化学反应', probability: 5, icon: '🧪' },
                    { title: '性感天文', desc: '用身体表示星座', probability: 6, icon: '🌌' },
                    { title: '欲望文学', desc: '创作短篇情色故事', probability: 4, icon: '📚' },
                    { title: '情欲音乐', desc: '用身体演奏情欲乐章', probability: 5, icon: '🎻' }
                ]
            }
        ];

        saveData();
    }
}

function drawWheel() {
    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;
    const centerX = displayWidth / 2;
    const centerY = displayHeight / 2;
    const radius = (displayWidth / 2) - 10;

    const allItems = [...gameData.rewards, ...gameData.punishments];
    const numSlices = 12;
    const anglePerSlice = (Math.PI * 2) / numSlices;

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    for (let i = 0; i < numSlices; i++) {
        const startAngle = i * anglePerSlice;
        const endAngle = startAngle + anglePerSlice;
        const colors = i % 2 === 0 ? ['#fff9e6', '#ffd700'] : ['#fff0f5', '#ff69b4'];
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + anglePerSlice / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const iconSize = Math.max(14, radius * 0.15);
        ctx.font = `bold ${iconSize}px Arial`;
        ctx.fillStyle = '#333';
        const icon = i % 2 === 0 ? '🎁' : '😈';
        ctx.fillText(icon, radius * 0.7, 0);
        ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#ff6b9d';
    ctx.lineWidth = 5;
    ctx.stroke();
}

// 根据权重随机选择项目
function selectItemByWeight(items) {
    if (items.length === 0) return null;

    // 计算总权重
    const totalWeight = items.reduce((sum, item) => sum + (item.probability || 5), 0);

    // 生成随机数
    let random = Math.random() * totalWeight;

    // 根据权重选择项目
    for (const item of items) {
        random -= item.probability || 5;
        if (random <= 0) {
            return item;
        }
    }

    return items[items.length - 1];
}

// 修改 startSpin 函数
function startSpin() {
    // 检查冷却时间
    if (!checkCooldown()) {
        return;
    }

    if (isSpinning) return;

    const allItems = [...gameData.rewards, ...gameData.punishments];
    if (allItems.length === 0) {
        alert('请先添加奖惩项目!');
        return;
    }

    isSpinning = true;
    const button = document.getElementById('spinButton');
    button.classList.add('spinning');

    // 开始生成粒子效果
    createSpinParticles();

    // 获取当前游戏模式
    const gameMode = document.querySelector('input[name="gameMode"]:checked').value;

    // 1. 先随机选择结果（根据权重）
    let selectedItem;
    if (Math.random() < gameData.rewards.length / allItems.length) {
        selectedItem = selectItemByWeight(gameData.rewards);
        currentResult = { ...selectedItem, type: 'reward' };
    } else {
        selectedItem = selectItemByWeight(gameData.punishments);
        currentResult = { ...selectedItem, type: 'punishment' };
    }

    // 2. 根据结果类型决定目标扇区
    const numSlices = 12;
    const anglePerSlice = 360 / numSlices;

    // 根据结果类型选择对应的扇区 (偶数扇区=奖励🎁, 奇数扇区=惩罚😈)
    let availableSlices;
    if (currentResult.type === 'reward') {
        availableSlices = [0, 2, 4, 6, 8, 10]; // 偶数扇区(黄色/奖励)
    } else {
        availableSlices = [1, 3, 5, 7, 9, 11]; // 奇数扇区(粉色/惩罚)
    }

    // 3. 从对应类型的扇区中随机选择一个
    const targetSlice = availableSlices[Math.floor(Math.random() * availableSlices.length)];

    // 4. 计算目标角度 - 指针指向指向扇区中心
    // 注意:指针在正上方(0度),所以需要调整角度计算
    // 扇区0从正上方开始,顺时针旋转
    const targetAngle = 360 - (targetSlice * anglePerSlice + anglePerSlice / 2);

    // 5. 增加多圈旋转 + 目标角度
    const spinRotations = 5 + Math.random() * 3; // 5-8圈
    const additionalRotation = 360 * spinRotations + targetAngle;
    currentRotation += additionalRotation;

    // 6. 执行旋转动画
    const canvas = document.getElementById('wheelCanvas');
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    // 新增：播放抽奖音乐
    playSpinMusic();

    setTimeout(() => {
        isSpinning = false;
        button.classList.remove('spinning');

        // 根据结果类型添加特效
        const wheelContainer = document.querySelector('.wheel-container');
        if (currentResult.type === 'reward') {
            wheelContainer.classList.add('flash-gold');
            setTimeout(() => wheelContainer.classList.remove('flash-gold'), 1000);
        } else {
            wheelContainer.classList.add('shake-red');
            setTimeout(() => wheelContainer.classList.remove('shake-red'), 500);
        }

        // 记录最后抽奖时间
        gameData.stats.lastDrawTime = Date.now();
        saveData();
        checkCooldown();

        // 处理合作模式
        if (gameMode === 'coop') {
            handleCoopMode();
        } else {
            showResult();
        }
    }, 5000);
}

// 显示结果弹窗并添加相应图标
function showResult() {
    if (!currentResult) return;

    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultDesc = document.getElementById('resultDesc');
    const resultVisual = document.getElementById('resultVisual');
    const useOffsetBtn = document.getElementById('useOffsetBtn');

    // 设置结果内容
    if (currentResult.type === 'reward') {
        resultIcon.textContent = '🎉';
        resultTitle.textContent = `恭喜获得奖励！`;
    } else {
        resultIcon.textContent = '😈';
        resultTitle.textContent = `抽到惩罚啦！`;
        useOffsetBtn.style.display = gameData.playerOffsetCards[gameData.currentPlayer] > 0 ? 'block' : 'none';
    }

    // 设置视觉图标
    resultVisual.textContent = currentResult.icon || (currentResult.type === 'reward' ? '🎁' : '😈');

    resultDesc.textContent = currentResult.desc || currentResult.title;

    // 显示弹窗
    document.getElementById('resultModal').classList.add('active');

    // 重置合作模式相关显示
    document.getElementById('coopResults').style.display = 'none';
    document.getElementById('coopSelection').style.display = 'none';
    document.getElementById('coopConfirmBtn').style.display = 'none';
    document.getElementById('coopRetryBtn').style.display = 'none';

    // 显示普通模式按钮
    document.getElementById('normalCompleteBtn').style.display = 'block';
    document.getElementById('normalSkipBtn').style.display = 'block';
}

// 保存设置（新增主题设置）
function saveSettings() {
    const cooldownSetting = document.getElementById('cooldownSetting').value;
    const themeSetting = document.getElementById('themeSetting').value;

    if (cooldownSetting) {
        gameData.settings.cooldownTime = parseInt(cooldownSetting);
        document.getElementById('cooldownTime').textContent = gameData.settings.cooldownTime;
    }

    if (themeSetting) {
        gameData.settings.theme = themeSetting;
        applyTheme(themeSetting);
    }

    saveData();
    closeSettingsModal();
}

// 打开设置模态框（新增主题设置）
function openSettingsModal() {
    document.getElementById('cooldownSetting').value = gameData.settings.cooldownTime;
    document.getElementById('themeSetting').value = gameData.settings.theme;
    document.getElementById('settingsModal').classList.add('active');
}

// 以下为原有函数，保持不变
function checkCooldown() {
    const now = Date.now();
    const cooldownTime = gameData.settings.cooldownTime * 1000;
    const timeSinceLastDraw = now - gameData.stats.lastDrawTime;

    if (gameData.stats.lastDrawTime && timeSinceLastDraw < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - timeSinceLastDraw) / 1000);
        const cooldownMessage = document.getElementById('cooldownMessage');
        const cooldownCounter = document.getElementById('cooldownCounter');

        cooldownCounter.textContent = remaining;
        cooldownMessage.style.display = 'block';

        if (!cooldownTimer) {
            cooldownTimer = setInterval(() => {
                const newRemaining = Math.ceil((cooldownTime - (Date.now() - gameData.stats.lastDrawTime)) / 1000);
                cooldownCounter.textContent = newRemaining;

                if (newRemaining <= 0) {
                    cooldownMessage.style.display = 'none';
                    clearInterval(cooldownTimer);
                    cooldownTimer = null;
                }
            }, 1000);
        }

        return false;
    } else {
        document.getElementById('cooldownMessage').style.display = 'none';
        if (cooldownTimer) {
            clearInterval(cooldownTimer);
            cooldownTimer = null;
        }
        return true;
    }
}

function updateStats() {
    document.getElementById('totalRewards').textContent = gameData.rewards.length;
    document.getElementById('totalPunishments').textContent = gameData.punishments.length;
    document.getElementById('totalDraws').textContent = gameData.stats.totalDraws;
    // 修改：移除今日抽奖和抵消卡数量的显示更新
    document.getElementById('cooldownTime').textContent = gameData.settings.cooldownTime;

    // 更新玩家统计
    document.querySelector('#player1Stats .stat-number').textContent = gameData.stats.player1.draws;
    document.querySelector('#player1Rewards .stat-number').textContent = gameData.stats.player1.rewards;
    document.querySelector('#player2Stats .stat-number').textContent = gameData.stats.player2.draws;
    document.querySelector('#player2Rewards .stat-number').textContent = gameData.stats.player2.rewards;
}

// 修改玩家显示函数，支持合作模式和头像显示
function updatePlayerDisplay() {
    const playerElement = document.getElementById('currentPlayer');
    const gameMode = document.querySelector('input[name="gameMode"]:checked').value;

    // 检查头像是否有效
    function isValidAvatar(avatar) {
        if (!avatar) return false;
        // 如果是默认头像路径，假设有效
        if (avatar === './player1.svg' || avatar === './player2.svg') {
            return true;
        }
        // 如果是base64数据URI，假设有效
        if (avatar.startsWith('data:image/')) {
            return true;
        }
        return false;
    }

    if (gameMode === 'coop') {
        // 合作模式下显示两个玩家
        const player1Avatar = isValidAvatar(gameData.players.player1.avatar) ?
            `<img class="player-avatar" src="${gameData.players.player1.avatar}" alt="${gameData.players.player1.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` :
            `<div class="player-avatar default-avatar">${gameData.players.player1.name.charAt(0)}</div>`;

        const player2Avatar = isValidAvatar(gameData.players.player2.avatar) ?
            `<img class="player-avatar" src="${gameData.players.player2.avatar}" alt="${gameData.players.player2.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` :
            `<div class="player-avatar default-avatar">${gameData.players.player2.name.charAt(0)}</div>`;

        playerElement.innerHTML = `
            <div class="player-display">
                ${player1Avatar}
                <span>${gameData.players.player1.name}</span>
                <span>❤</span>
                <span>${gameData.players.player2.name}</span>
                ${player2Avatar}
            </div>
        `;
    } else {
        // 普通模式下显示当前玩家
        const currentPlayerData = gameData.players[gameData.currentPlayer];
        const playerAvatar = isValidAvatar(currentPlayerData.avatar) ?
            `<img class="player-avatar" src="${currentPlayerData.avatar}" alt="${currentPlayerData.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` :
            `<div class="player-avatar default-avatar">${currentPlayerData.name.charAt(0)}</div>`;

        playerElement.innerHTML = `
            <div class="player-display">
                ${playerAvatar}
                <span>${currentPlayerData.name}</span>
            </div>
        `;
    }
}

function loadData() {
    const savedData = localStorage.getItem('coupleWheelData');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        // 合并数据，确保新字段不会丢失
        gameData = { ...gameData, ...parsedData };

        // 兼容旧数据：如果存在emoji字段但没有avatar字段，将emoji转换为默认头像
        if (gameData.players.player1.emoji && !gameData.players.player1.avatar) {
            gameData.players.player1.avatar = null;
            delete gameData.players.player1.emoji;
        }
        if (gameData.players.player2.emoji && !gameData.players.player2.avatar) {
            gameData.players.player2.avatar = null;
            delete gameData.players.player2.emoji;
        }

        // 确保模板数据结构完整
        if (!gameData.templates) {
            gameData.templates = {
                sweetInteraction: [],
                lifeBlessing: [],
                funChallenge: [],
                romanticMoment: [],
                intimateGame: [],
                coopMode: [] // 新增：合作模式
            };
        }

        // 确保当前模板字段存在
        if (!gameData.currentTemplate) {
            gameData.currentTemplate = null;
        }

        // 确保未完成事项数据结构完整
        if (!gameData.pendingItems) {
            gameData.pendingItems = {
                player1: {
                    rewards: [],
                    punishments: []
                },
                player2: {
                    rewards: [],
                    punishments: []
                }
            };
        }

        // 确保玩家抵消卡数量结构完整
        if (!gameData.playerOffsetCards) {
            gameData.playerOffsetCards = {
                player1: 0,
                player2: 0
            };
        }

        // 确保音乐设置结构完整
        if (!gameData.settings.bgMusic) {
            gameData.settings.bgMusic = {
                enabled: false,
                volume: 50,
                src: null,
                useDefault: true
            };
        }
        if (!gameData.settings.spinMusic) {
            gameData.settings.spinMusic = {
                enabled: false,
                volume: 50,
                src: null,
                useDefault: true
            };
        }
    }
}

function saveData() {
    localStorage.setItem('coupleWheelData', JSON.stringify(gameData));
}

function clearHistory() {
    if (confirm('确定要清空抽奖历史吗？')) {
        gameData.history = [];
        document.getElementById('historyList').innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无记录</p>';
        saveData();
    }
}

function exchangeOffsetCard() {
    const requiredRewards = 5;
    const currentPlayer = gameData.currentPlayer;

    if (gameData.stats[currentPlayer].rewards >= requiredRewards) {
        gameData.stats[currentPlayer].rewards -= requiredRewards;
        gameData.playerOffsetCards[currentPlayer] += 1;
        updateStats();
        saveData();
        alert(`成功兑换1张抵消卡！消耗了${requiredRewards}个奖励`);
    } else {
        alert(`奖励数量不足，需要${requiredRewards}个奖励才能兑换1张抵消卡`);
    }
}

function useOffsetCard() {
    if (gameData.playerOffsetCards[gameData.currentPlayer] > 0) {
        gameData.playerOffsetCards[gameData.currentPlayer] -= 1;
        addToHistory(currentResult, true);
        updateStats();
        saveData();
        closeResultModal();
    }
}

function completeTask() {
    addToHistory(currentResult, false);
    closeResultModal();
}

function skipTask() {
    // 将当前结果添加到未完成事项
    const pendingItem = {
        ...currentResult,
        timestamp: Date.now(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
    };

    if (currentResult.type === 'reward') {
        gameData.pendingItems[gameData.currentPlayer].rewards.push(pendingItem);
    } else {
        gameData.pendingItems[gameData.currentPlayer].punishments.push(pendingItem);
    }

    addToHistory(currentResult, true);
    closeResultModal();
}

function addToHistory(result, isSkipped) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const historyItem = {
        type: result.type,
        title: result.title,
        time: timeStr,
        date: now.toISOString().split('T')[0],
        player: gameData.currentPlayer,
        isSkipped: isSkipped
    };

    gameData.history.unshift(historyItem);
    updateHistoryDisplay();

    // 更新统计
    gameData.stats.totalDraws++;

    // 检查是否是新的一天
    const today = new Date().toISOString().split('T')[0];
    if (gameData.stats.lastDrawDate !== today) {
        gameData.stats.lastDrawDate = today;
        gameData.stats.todayDraws = 1;
    } else {
        gameData.stats.todayDraws++;
    }

    // 更新玩家统计
    gameData.stats[gameData.currentPlayer].draws++;
    if (result.type === 'reward' && !isSkipped) {
        gameData.stats[gameData.currentPlayer].rewards++;
    } else if (result.type === 'punishment' && isSkipped) {
        gameData.stats[gameData.currentPlayer].punishments++;
    }

    updateStats();
    saveData();

    // 切换玩家
    gameData.currentPlayer = gameData.currentPlayer === 'player1' ? 'player2' : 'player1';
    updatePlayerDisplay();
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');

    if (gameData.history.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无记录</p>';
        return;
    }

    historyList.innerHTML = '';

    gameData.history.forEach(item => {
        const player = gameData.players[item.player];
        const itemElement = document.createElement('div');
        itemElement.className = `history-item ${item.type}`;

        let statusText = '';
        if (item.isSkipped) {
            statusText = '（未完成）';
        }

        itemElement.innerHTML = `
            <div class="history-time">${item.time} ${player.name}</div>
            <div class="history-content">${item.type === 'reward' ? '🎁' : '😈'} ${item.title} ${statusText}</div>
        `;

        historyList.appendChild(itemElement);
    });
}

function resetData() {
    if (confirm('确定要重置所有数据吗？这将清除所有设置和历史记录！')) {
        // 保留默认设置但清除数据
        const defaultSettings = {
            cooldownTime: gameData.settings.cooldownTime,
            theme: gameData.settings.theme,
            bgMusic: gameData.settings.bgMusic,
            spinMusic: gameData.settings.spinMusic
        };

        const players = gameData.players;

        gameData = {
            rewards: [],
            punishments: [],
            history: [],
            stats: {
                totalDraws: 0,
                todayDraws: 0,
                lastDrawDate: null,
                lastDrawTime: 0,
                offsetCards: 0,
                player1: {
                    draws: 0,
                    rewards: 0,
                    punishments: 0
                },
                player2: {
                    draws: 0,
                    rewards: 0,
                    punishments: 0
                }
            },
            players: players,
            settings: defaultSettings,
            currentPlayer: 'player1',
            coopModeData: {
                isActive: false,
                firstResult: null
            },
            templates: gameData.templates, // 保留模板数据
            customBackground: gameData.customBackground, // 保留自定义背景
            currentTemplate: null, // 重置当前模板
            // 重置未完成事项数据
            pendingItems: {
                player1: {
                    rewards: [],
                    punishments: []
                },
                player2: {
                    rewards: [],
                    punishments: []
                }
            },
            // 重置玩家抵消卡数量
            playerOffsetCards: {
                player1: 0,
                player2: 0
            }
        };

        initDefaultData();
        drawWheel();
        updateStats();
        updateHistoryDisplay();
        saveData();

        // 重置音频
        initAudioSettings();
    }
}

function openManageModal() {
    renderItemLists();
    document.getElementById('manageModal').classList.add('active');
}

function closeManageModal() {
    document.getElementById('manageModal').classList.remove('active');
}

function renderItemLists() {
    const rewardList = document.getElementById('rewardList');
    const punishmentList = document.getElementById('punishmentList');

    rewardList.innerHTML = '';
    gameData.rewards.forEach((item, index) => {
        rewardList.appendChild(createItemCard(item, 'reward', index));
    });

    punishmentList.innerHTML = '';
    gameData.punishments.forEach((item, index) => {
        punishmentList.appendChild(createItemCard(item, 'punishment', index));
    });
}

function createItemCard(item, type, index) {
    const card = document.createElement('div');
    card.className = 'item-card';

    card.innerHTML = `
        <div class="item-content">
            <div class="item-title">${item.title}</div>
            <div class="item-desc">${item.desc || '无描述'}</div>
            <div class="item-desc">概率: ${item.probability || 5}</div>
        </div>
        <div class="item-actions">
            <button class="edit-btn" onclick="editItem('${type}', ${index})">编辑</button>
            <button class="delete-btn" onclick="deleteItem('${type}', ${index})">删除</button>
        </div>
    `;

    return card;
}

function addItem(type) {
    editingItem = null;
    editingType = type;
    document.getElementById('editTitle').textContent = `添加${type === 'reward' ? '奖励' : '惩罚'}`;
    document.getElementById('itemTitle').value = '';
    document.getElementById('itemDesc').value = '';
    document.getElementById('itemProbability').value = 5;
    document.getElementById('editModal').classList.add('active');
}

function editItem(type, index) {
    editingType = type;
    const items = type === 'reward' ? gameData.rewards : gameData.punishments;
    editingItem = index;

    const item = items[index];
    document.getElementById('editTitle').textContent = `编辑${type === 'reward' ? '奖励' : '惩罚'}`;
    document.getElementById('itemTitle').value = item.title;
    document.getElementById('itemDesc').value = item.desc || '';
    document.getElementById('itemProbability').value = item.probability || 5;
    document.getElementById('editModal').classList.add('active');
}

function deleteItem(type, index) {
    if (confirm('确定要删除这个项目吗？')) {
        if (type === 'reward') {
            gameData.rewards.splice(index, 1);
        } else {
            gameData.punishments.splice(index, 1);
        }

        renderItemLists();
        saveData();
        drawWheel();
    }
}

function saveItem() {
    const title = document.getElementById('itemTitle').value.trim();
    const desc = document.getElementById('itemDesc').value.trim();
    const probability = parseInt(document.getElementById('itemProbability').value) || 5;

    if (!title) {
        alert('请输入项目标题');
        return;
    }

    const newItem = {
        title,
        desc,
        probability,
        // 根据标题自动分配图标
        icon: getIconForItem(title, editingType)
    };

    if (editingItem === null) {
        // 添加新项目
        if (editingType === 'reward') {
            gameData.rewards.push(newItem);
        } else {
            gameData.punishments.push(newItem);
        }
    } else {
        // 编辑现有项目
        if (editingType === 'reward') {
            gameData.rewards[editingItem] = newItem;
        } else {
            gameData.punishments[editingItem] = newItem;
        }
    }

    closeEditModal();
    renderItemLists();
    saveData();
    drawWheel();
    updateStats();
}

// 根据项目标题自动分配图标
function getIconForItem(title, type) {
    // 奖励图标映射
    const rewardIcons = [
        { keywords: ['唱', '歌', '音乐'], icon: '🎤' },
        { keywords: ['吃', '餐', '食物', '喝', '饮品'], icon: '🍽️' },
        { keywords: ['按摩', '放松', '捶背'], icon: '💆' },
        { keywords: ['购物', '买'], icon: '🛍️' },
        { keywords: ['电影', '看片'], icon: '🎬' },
        { keywords: ['游戏', '玩'], icon: '🎮' },
        { keywords: ['散步', '约会'], icon: '🚶' }
    ];

    // 惩罚图标映射
    const punishmentIcons = [
        { keywords: ['模仿', '学'], icon: '🤡' },
        { keywords: ['唱歌', '跳舞'], icon: '💃' },
        { keywords: ['运动', '跳', '跑', '转圈'], icon: '🏃' },
        { keywords: ['打扫', '清洁'], icon: '🧹' },
        { keywords: ['鬼脸', '自拍'], icon: '📸' },
        { keywords: ['吃', '喝'], icon: '🍺' }
    ];

    const icons = type === 'reward' ? rewardIcons : punishmentIcons;
    const lowerTitle = title.toLowerCase();

    for (const { keywords, icon } of icons) {
        for (const keyword of keywords) {
            if (lowerTitle.includes(keyword)) {
                return icon;
            }
        }
    }

    // 默认图标
    return type === 'reward' ? '🎁' : '😈';
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

function openSettingsModal() {
    document.getElementById('cooldownSetting').value = gameData.settings.cooldownTime;
    document.getElementById('themeSetting').value = gameData.settings.theme;
    document.getElementById('settingsModal').classList.add('active');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

function saveSettings() {
    const cooldown = parseInt(document.getElementById('cooldownSetting').value);
    const theme = document.getElementById('themeSetting').value;

    if (!isNaN(cooldown) && cooldown >= 0 && cooldown <= 300) {
        gameData.settings.cooldownTime = cooldown;
    }

    if (theme) {
        gameData.settings.theme = theme;
        applyTheme(theme);
    }

    updateStats();
    saveData();
    closeSettingsModal();
}

// 修改：打开玩家设置模态框，添加头像预览和文件上传处理
function openPlayerSettingsModal() {
    document.getElementById('player1Name').value = gameData.players.player1.name;
    document.getElementById('player2Name').value = gameData.players.player2.name;

    // 设置头像预览
    const player1AvatarPreview = document.getElementById('player1AvatarPreview');
    const player2AvatarPreview = document.getElementById('player2AvatarPreview');

    // 检查头像是否有效
    function isValidAvatar(avatar) {
        if (!avatar) return false;
        // 如果是默认头像路径，假设有效
        if (avatar === './player1.svg' || avatar === './player2.svg') {
            return true;
        }
        // 如果是base64数据URI，假设有效
        if (avatar.startsWith('data:image/')) {
            return true;
        }
        return false;
    }

    if (isValidAvatar(gameData.players.player1.avatar)) {
        player1AvatarPreview.src = gameData.players.player1.avatar;
    } else {
        // 显示默认头像
        player1AvatarPreview.src = './player1.svg';
        player1AvatarPreview.alt = '玩家1默认头像';
    }

    if (isValidAvatar(gameData.players.player2.avatar)) {
        player2AvatarPreview.src = gameData.players.player2.avatar;
    } else {
        // 显示默认头像
        player2AvatarPreview.src = './player2.svg';
        player2AvatarPreview.alt = '玩家2默认头像';
    }

    // 添加头像上传事件监听
    document.getElementById('player1Avatar').addEventListener('change', handleAvatarUpload);
    document.getElementById('player2Avatar').addEventListener('change', handleAvatarUpload);

    document.getElementById('playerSettingsModal').classList.add('active');
}

function closePlayerSettingsModal() {
    document.getElementById('playerSettingsModal').classList.remove('active');
}

// 修改：处理头像上传
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.match('image.*')) {
        alert('请选择图片文件！');
        return;
    }

    // 检查文件大小（限制为2MB）
    if (file.size > 2 * 1024 * 1024) {
        alert('图片大小不能超过2MB！');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        // 根据上传的input确定是哪个玩家
        const playerId = event.target.id === 'player1Avatar' ? 'player1' : 'player2';
        const previewId = playerId === 'player1' ? 'player1AvatarPreview' : 'player2AvatarPreview';

        // 更新预览
        document.getElementById(previewId).src = e.target.result;

        // 临时保存头像数据，等待保存设置
        if (!window.tempAvatarData) window.tempAvatarData = {};
        window.tempAvatarData[playerId] = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 修改：保存玩家设置，包括头像
function savePlayerSettings() {
    const player1Name = document.getElementById('player1Name').value.trim() || '玩家1';
    const player2Name = document.getElementById('player2Name').value.trim() || '玩家2';

    gameData.players.player1.name = player1Name;
    gameData.players.player2.name = player2Name;

    // 保存头像数据
    if (window.tempAvatarData) {
        if (window.tempAvatarData.player1) {
            gameData.players.player1.avatar = window.tempAvatarData.player1;
        }
        if (window.tempAvatarData.player2) {
            gameData.players.player2.avatar = window.tempAvatarData.player2;
        }
        // 清除临时数据
        window.tempAvatarData = null;
    }

    updatePlayerDisplay();
    saveData();
    closePlayerSettingsModal();
}

function closeResultModal() {
    document.getElementById('resultModal').classList.remove('active');
    document.getElementById('useOffsetBtn').style.display = 'none';
    currentResult = null;

    // 重置合作模式相关显示
    document.getElementById('coopResults').style.display = 'none';
    document.getElementById('coopSelection').style.display = 'none';
    document.getElementById('coopConfirmBtn').style.display = 'none';
    document.getElementById('coopRetryBtn').style.display = 'none';
    document.getElementById('normalCompleteBtn').style.display = 'block';
    document.getElementById('normalSkipBtn').style.display = 'block';

    // 重置合作模式选择状态
    coopSelections = {
        player1: null,
        player2: null
    };

    // 重置复选框
    document.getElementById('player1Complete').checked = false;
    document.getElementById('player1Skip').checked = false;
    document.getElementById('player2Complete').checked = false;
    document.getElementById('player2Skip').checked = false;
}

// 修改合作模式处理逻辑
function handleCoopMode() {
    // 清空之前的结果
    coopResults = {
        player1: null,
        player2: null
    };

    // 为两个玩家分别抽取结果
    const allItems = [...gameData.rewards, ...gameData.punishments];

    // 抽取玩家1的结果
    let selectedItem1;
    if (Math.random() < gameData.rewards.length / allItems.length) {
        selectedItem1 = selectItemByWeight(gameData.rewards);
        coopResults.player1 = { ...selectedItem1, type: 'reward' };
    } else {
        selectedItem1 = selectItemByWeight(gameData.punishments);
        coopResults.player1 = { ...selectedItem1, type: 'punishment' };
    }

    // 抽取玩家2的结果
    let selectedItem2;
    if (Math.random() < gameData.rewards.length / allItems.length) {
        selectedItem2 = selectItemByWeight(gameData.rewards);
        coopResults.player2 = { ...selectedItem2, type: 'reward' };
    } else {
        selectedItem2 = selectItemByWeight(gameData.punishments);
        coopResults.player2 = { ...selectedItem2, type: 'punishment' };
    }

    // 显示合作模式结果
    showCoopResult();
}

// 显示合作模式结果
function showCoopResult() {
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultDesc = document.getElementById('resultDesc');
    const resultVisual = document.getElementById('resultVisual');
    const coopResultsElement = document.getElementById('coopResults');
    const coopOutcome = document.getElementById('coopOutcome');
    const coopSelection = document.getElementById('coopSelection');
    const coopRetryBtn = document.getElementById('coopRetryBtn');

    // 设置玩家1的结果
    document.getElementById('player1ResultName').textContent = gameData.players.player1.name;
    document.getElementById('player1ResultIcon').textContent = coopResults.player1.icon || (coopResults.player1.type === 'reward' ? '🎁' : '😈');
    document.getElementById('player1ResultTitle').textContent = coopResults.player1.title;
    document.getElementById('player1ResultDesc').textContent = coopResults.player1.desc || coopResults.player1.title;

    // 设置玩家2的结果
    document.getElementById('player2ResultName').textContent = gameData.players.player2.name;
    document.getElementById('player2ResultIcon').textContent = coopResults.player2.icon || (coopResults.player2.type === 'reward' ? '🎁' : '😈');
    document.getElementById('player2ResultTitle').textContent = coopResults.player2.title;
    document.getElementById('player2ResultDesc').textContent = coopResults.player2.desc || coopResults.player2.title;

    // 设置选择界面中的玩家名称
    document.getElementById('selectionPlayer1Name').textContent = gameData.players.player1.name;
    document.getElementById('selectionPlayer2Name').textContent = gameData.players.player2.name;

    // 根据结果组合设置不同的提示信息
    if (coopResults.player1.type === 'reward' && coopResults.player2.type === 'reward') {
        // 双倍奖励
        resultIcon.textContent = '🎊';
        resultTitle.textContent = '双倍奖励！';
        resultDesc.textContent = '太棒了！你们获得了双倍奖励！';
        resultVisual.textContent = '🎁🎁';
        coopOutcome.textContent = '恭喜！你们可以同时享受对方的奖励！';
        coopOutcome.style.color = '#ffd700';

        // 显示选择界面
        coopSelection.style.display = 'block';
        coopRetryBtn.style.display = 'none';
    } else if (coopResults.player1.type === 'punishment' && coopResults.player2.type === 'punishment') {
        // 双倍惩罚
        resultIcon.textContent = '😱';
        resultTitle.textContent = '双倍惩罚！';
        resultDesc.textContent = '哦不！你们需要接受双倍惩罚！';
        resultVisual.textContent = '😈😈';
        coopOutcome.textContent = '加油！你们需要同时完成对方的惩罚！';
        coopOutcome.style.color = '#ff6b9d';

        // 显示选择界面
        coopSelection.style.display = 'block';
        coopRetryBtn.style.display = 'none';
    } else {
        // 一个奖励一个惩罚
        resultIcon.textContent = '🔄';
        resultTitle.textContent = '再来一次！';
        resultDesc.textContent = '一个奖励一个惩罚，重新抽奖！';
        resultVisual.textContent = '🎁😈';
        coopOutcome.textContent = '一个奖励一个惩罚，这次不算，重新抽奖！';
        coopOutcome.style.color = '#999';

        // 显示确定按钮
        coopSelection.style.display = 'none';
        coopRetryBtn.style.display = 'block';
    }

    // 显示合作模式结果区域
    coopResultsElement.style.display = 'block';

    // 隐藏普通模式按钮
    document.getElementById('normalCompleteBtn').style.display = 'none';
    document.getElementById('normalSkipBtn').style.display = 'none';

    // 显示弹窗
    document.getElementById('resultModal').classList.add('active');
}

// 更新合作模式确认按钮的显示状态
function updateCoopConfirmButton() {
    const player1Complete = document.getElementById('player1Complete').checked;
    const player1Skip = document.getElementById('player1Skip').checked;
    const player2Complete = document.getElementById('player2Complete').checked;
    const player2Skip = document.getElementById('player2Skip').checked;

    // 确保每个玩家只能选择一个选项
    if (player1Complete && player1Skip) {
        document.getElementById('player1Skip').checked = false;
    }
    if (player2Complete && player2Skip) {
        document.getElementById('player2Skip').checked = false;
    }

    // 记录选择状态
    if (player1Complete) {
        coopSelections.player1 = 'complete';
    } else if (player1Skip) {
        coopSelections.player1 = 'skip';
    } else {
        coopSelections.player1 = null;
    }

    if (player2Complete) {
        coopSelections.player2 = 'complete';
    } else if (player2Skip) {
        coopSelections.player2 = 'skip';
    } else {
        coopSelections.player2 = null;
    }

    // 只有当两个玩家都做出选择时才显示确定按钮
    if (coopSelections.player1 && coopSelections.player2) {
        document.getElementById('coopConfirmBtn').style.display = 'block';
    } else {
        document.getElementById('coopConfirmBtn').style.display = 'none';
    }
}

// 确认合作模式选择
function confirmCoopSelection() {
    // 更新总抽奖次数
    gameData.stats.totalDraws += 2;

    // 检查是否是新的一天
    const today = new Date().toISOString().split('T')[0];
    if (gameData.stats.lastDrawDate !== today) {
        gameData.stats.lastDrawDate = today;
        gameData.stats.todayDraws = 2;
    } else {
        gameData.stats.todayDraws += 2;
    }

    // 更新玩家统计
    gameData.stats.player1.draws++;
    gameData.stats.player2.draws++;

    // 添加历史记录
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 添加玩家1的历史记录
    const isPlayer1Skipped = coopSelections.player1 === 'skip';
    const historyItem1 = {
        type: coopResults.player1.type,
        title: coopResults.player1.title,
        time: timeStr,
        date: now.toISOString().split('T')[0],
        player: 'player1',
        isSkipped: isPlayer1Skipped
    };

    // 添加玩家2的历史记录
    const isPlayer2Skipped = coopSelections.player2 === 'skip';
    const historyItem2 = {
        type: coopResults.player2.type,
        title: coopResults.player2.title,
        time: timeStr,
        date: now.toISOString().split('T')[0],
        player: 'player2',
        isSkipped: isPlayer2Skipped
    };

    gameData.history.unshift(historyItem1);
    gameData.history.unshift(historyItem2);

    // 处理未完成事项
    if (isPlayer1Skipped) {
        const pendingItem = {
            ...coopResults.player1,
            timestamp: Date.now(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        };

        if (coopResults.player1.type === 'reward') {
            gameData.pendingItems.player1.rewards.push(pendingItem);
        } else {
            gameData.pendingItems.player1.punishments.push(pendingItem);
        }
    } else {
        // 完成任务，更新奖励/惩罚统计
        if (coopResults.player1.type === 'reward') {
            gameData.stats.player1.rewards++;
        } else {
            gameData.stats.player1.punishments++;
        }
    }

    if (isPlayer2Skipped) {
        const pendingItem = {
            ...coopResults.player2,
            timestamp: Date.now(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        };

        if (coopResults.player2.type === 'reward') {
            gameData.pendingItems.player2.rewards.push(pendingItem);
        } else {
            gameData.pendingItems.player2.punishments.push(pendingItem);
        }
    } else {
        // 完成任务，更新奖励/惩罚统计
        if (coopResults.player2.type === 'reward') {
            gameData.stats.player2.rewards++;
        } else {
            gameData.stats.player2.punishments++;
        }
    }

    updateStats();
    updateHistoryDisplay();
    saveData();
    closeResultModal();
}

// ========== 新增功能：自定义背景 ==========

// 上传自定义背景
function uploadCustomBg() {
    const fileInput = document.getElementById('customBackground');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            gameData.customBackground = e.target.result;
            saveData();
            loadCustomBackground();
            alert('背景图片上传成功！');
        };
        reader.readAsDataURL(file);
    } else {
        alert('请选择一张图片文件');
    }
}

// 移除自定义背景
function removeCustomBg() {
    gameData.customBackground = null;
    saveData();
    loadCustomBackground();
    alert('背景图片已移除');
}

// 加载自定义背景
function loadCustomBackground() {
    const bgContainer = document.getElementById('customBgContainer');

    if (gameData.customBackground) {
        bgContainer.style.backgroundImage = `url(${gameData.customBackground})`;
        bgContainer.style.display = 'block';
    } else {
        bgContainer.style.backgroundImage = 'none';
        bgContainer.style.display = 'none';
    }
}

// ========== 新增功能：模板库管理 ==========

// 打开模板库管理模态框
function openTemplateModal() {
    renderTemplateLists();
    document.getElementById('templateModal').classList.add('active');
}

// 关闭模板库管理模态框
function closeTemplateModal() {
    document.getElementById('templateModal').classList.remove('active');
}

// 渲染模板列表
function renderTemplateLists() {
    const categories = {
        sweetInteraction: 'sweetInteractionTemplates',
        lifeBlessing: 'lifeBlessingTemplates',
        funChallenge: 'funChallengeTemplates',
        romanticMoment: 'romanticMomentTemplates',
        intimateGame: 'intimateGameTemplates',
        coopMode: 'coopModeTemplates' // 新增：合作模式
    };

    for (const [category, elementId] of Object.entries(categories)) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';

        gameData.templates[category].forEach((template, index) => {
            const templateElement = document.createElement('div');
            templateElement.className = 'template-item';

            templateElement.innerHTML = `
                <div class="template-item-info">
                    <div class="template-item-name">${template.name}</div>
                    <div class="template-item-stats">奖励: ${template.rewards.length} | 惩罚: ${template.punishments.length}</div>
                </div>
                <div class="template-item-actions">
                    <button class="template-load-btn" onclick="loadTemplateFromList('${category}', ${index})">加载</button>
                    <button class="template-delete-btn" onclick="deleteTemplate('${category}', ${index})">删除</button>
                </div>
            `;

            container.appendChild(templateElement);
        });
    }
}

// 添加模板
function addTemplate(category) {
    const templateName = prompt(`请输入${getCategoryName(category)}模板的名称：`);

    if (templateName && templateName.trim()) {
        const newTemplate = {
            name: templateName.trim(),
            rewards: [...gameData.rewards],
            punishments: [...gameData.punishments]
        };

        gameData.templates[category].push(newTemplate);
        saveData();
        renderTemplateLists();

        alert(`模板 "${templateName}" 已添加到${getCategoryName(category)}分类中`);
    }
}

// 从模板列表加载
function loadTemplateFromList(category, index) {
    const template = gameData.templates[category][index];

    if (confirm(`确定要加载模板 "${template.name}" 吗？这将替换当前的奖惩项目并重置统计数据！`)) {
        gameData.rewards = [...template.rewards];
        gameData.punishments = [...template.punishments];

        // 设置当前模板信息
        gameData.currentTemplate = {
            category: category,
            index: index,
            name: template.name
        };

        // 重置统计数据
        gameData.stats.totalDraws = 0;
        gameData.stats.todayDraws = 0;
        gameData.stats.lastDrawDate = null;
        gameData.stats.lastDrawTime = 0;
        gameData.stats.offsetCards = 0;
        gameData.stats.player1.draws = 0;
        gameData.stats.player1.rewards = 0;
        gameData.stats.player1.punishments = 0;
        gameData.stats.player2.draws = 0;
        gameData.stats.player2.rewards = 0;
        gameData.stats.player2.punishments = 0;
        gameData.history = [];

        saveData();
        renderItemLists();
        drawWheel();
        updateStats();
        updateHistoryDisplay();

        alert(`模板 "${template.name}" 已加载成功！`);
        closeTemplateModal();
    }
}

// 删除模板
function deleteTemplate(category, index) {
    const template = gameData.templates[category][index];

    if (confirm(`确定要删除模板 "${template.name}" 吗？`)) {
        gameData.templates[category].splice(index, 1);

        // 如果删除的是当前使用的模板，清除当前模板信息
        if (gameData.currentTemplate &&
            gameData.currentTemplate.category === category &&
            gameData.currentTemplate.index === index) {
            gameData.currentTemplate = null;
        }

        saveData();
        renderTemplateLists();

        alert(`模板 "${template.name}" 已删除`);
    }
}

// 保存当前设置为模板
function saveCurrentTemplate() {
    const templateName = prompt('请输入新模板的名称：');

    if (templateName && templateName.trim()) {
        const category = prompt(`请选择模板分类：
1. 甜蜜互动
2. 生活小确幸
3. 趣味挑战
4. 浪漫瞬间
5. 情趣游戏
6. 合作模式

请输入数字(1-6)：`);

        let categoryKey;
        switch (category) {
            case '1': categoryKey = 'sweetInteraction'; break;
            case '2': categoryKey = 'lifeBlessing'; break;
            case '3': categoryKey = 'funChallenge'; break;
            case '4': categoryKey = 'romanticMoment'; break;
            case '5': categoryKey = 'intimateGame'; break;
            case '6': categoryKey = 'coopMode'; break; // 新增：合作模式
            default:
                alert('无效的选择，模板保存取消');
                return;
        }

        const newTemplate = {
            name: templateName.trim(),
            rewards: [...gameData.rewards],
            punishments: [...gameData.punishments]
        };

        gameData.templates[categoryKey].push(newTemplate);
        saveData();

        alert(`模板 "${templateName}" 已保存到${getCategoryName(categoryKey)}分类中`);
    }
}

// 获取分类名称
function getCategoryName(categoryKey) {
    const names = {
        sweetInteraction: '甜蜜互动',
        lifeBlessing: '生活小确幸',
        funChallenge: '趣味挑战',
        romanticMoment: '浪漫瞬间',
        intimateGame: '情趣游戏',
        coopMode: '合作模式' // 新增：合作模式
    };

    return names[categoryKey] || categoryKey;
}

// ========== 新增功能：保存当前设置 ==========

// 保存当前设置到当前使用的模板
function saveCurrentSettings() {
    // 检查是否有当前使用的模板
    if (!gameData.currentTemplate) {
        alert('当前没有使用任何模板，请先加载一个模板！');
        return;
    }

    const category = gameData.currentTemplate.category;
    const index = gameData.currentTemplate.index;

    // 更新当前模板的内容
    gameData.templates[category][index].rewards = [...gameData.rewards];
    gameData.templates[category][index].punishments = [...gameData.punishments];

    saveData();

    alert(`当前设置已保存到模板 "${gameData.currentTemplate.name}" 中！`);
    closeManageModal();
}

// ========== 新增功能：未完成事项管理 ==========

// 打开未完成事项模态框
function openPendingModal() {
    updateOffsetCardsDisplay();
    renderPendingLists();
    document.getElementById('pendingModal').classList.add('active');
}

// 关闭未完成事项模态框
function closePendingModal() {
    document.getElementById('pendingModal').classList.remove('active');
}

// 更新抵消卡数量显示
function updateOffsetCardsDisplay() {
    document.getElementById('player1OffsetCount').textContent = gameData.playerOffsetCards.player1;
    document.getElementById('player2OffsetCount').textContent = gameData.playerOffsetCards.player2;
}

// 切换未完成事项标签页
function switchPendingTab(tabName) {
    // 更新标签按钮状态
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.textContent.includes(tabName === 'rewards' ? '奖励' : '惩罚')) {
            button.classList.add('active');
        }
    });

    // 更新标签内容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}Tab`) {
            content.classList.add('active');
        }
    });
}

// 渲染未完成事项列表
function renderPendingLists() {
    renderPlayerPendingList('player1', 'rewards', 'player1RewardsPending');
    renderPlayerPendingList('player1', 'punishments', 'player1PunishmentsPending');
    renderPlayerPendingList('player2', 'rewards', 'player2RewardsPending');
    renderPlayerPendingList('player2', 'punishments', 'player2PunishmentsPending');
}

// 渲染单个玩家的未完成事项列表
function renderPlayerPendingList(player, type, containerId) {
    const container = document.getElementById(containerId);
    const pendingItems = gameData.pendingItems[player][type];

    if (pendingItems.length === 0) {
        container.innerHTML = '<div class="empty-pending">暂无未完成事项</div>';
        return;
    }

    container.innerHTML = '';

    pendingItems.forEach((item, index) => {
        const pendingItem = document.createElement('div');
        pendingItem.className = `pending-item ${type}`;

        pendingItem.innerHTML = `
            <div class="pending-content">
                <div class="pending-title">${item.icon || (type === 'rewards' ? '🎁' : '😈')} ${item.title}</div>
                <div class="pending-desc">${item.desc || '无详细说明'}</div>
                <div class="pending-time">${item.date} ${item.time}</div>
            </div>
            <div class="pending-actions">
                <button class="complete-btn" onclick="completePendingItem('${player}', '${type}', ${index})">完成</button>
                ${type === 'punishments' ?
                `<button class="offset-btn" ${gameData.playerOffsetCards[player] === 0 ? 'disabled' : ''} onclick="offsetPendingItem('${player}', ${index})">抵消</button>` :
                ''
            }
            </div>
        `;

        container.appendChild(pendingItem);
    });
}

// 完成未完成事项
function completePendingItem(player, type, index) {
    const pendingItem = gameData.pendingItems[player][type][index];

    // 从未完成事项中移除
    gameData.pendingItems[player][type].splice(index, 1);

    // 更新统计数据
    if (type === 'rewards') {
        gameData.stats[player].rewards++;
    } else {
        gameData.stats[player].punishments++;
    }

    // 添加到历史记录
    const now = new Date();
    const historyItem = {
        type: type === 'rewards' ? 'reward' : 'punishment',
        title: pendingItem.title,
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
        date: now.toISOString().split('T')[0],
        player: player,
        isSkipped: false, // 标记为已完成
        completedFromPending: true // 标记为从未完成事项中完成
    };

    gameData.history.unshift(historyItem);

    saveData();
    updateStats();
    updateHistoryDisplay();
    renderPendingLists();

    alert(`已标记为完成！`);
}

// 抵消未完成事项（仅适用于惩罚）
function offsetPendingItem(player, index) {
    if (gameData.playerOffsetCards[player] === 0) {
        alert('抵消卡数量不足！');
        return;
    }

    const pendingItem = gameData.pendingItems[player].punishments[index];

    // 从未完成事项中移除
    gameData.pendingItems[player].punishments.splice(index, 1);

    // 消耗抵消卡
    gameData.playerOffsetCards[player]--;

    // 添加到历史记录
    const now = new Date();
    const historyItem = {
        type: 'punishment',
        title: pendingItem.title,
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
        date: now.toISOString().split('T')[0],
        player: player,
        isSkipped: true, // 标记为已跳过
        offsetUsed: true // 标记为使用了抵消卡
    };

    gameData.history.unshift(historyItem);

    saveData();
    updateStats();
    updateHistoryDisplay();
    updateOffsetCardsDisplay();
    renderPendingLists();

    alert(`已使用抵消卡抵消惩罚！`);
}

// ========== 新增功能：背景音乐和抽奖音乐设置 ==========

// 初始化音频设置
function initAudioSettings() {
    console.log('初始化音频设置...');

    // 清理旧的音频实例
    if (bgAudio) {
        bgAudio.pause();
        bgAudio = null;
    }
    if (spinAudio) {
        spinAudio.pause();
        spinAudio = null;
    }

    // 创建新的音频实例
    try {
        if (gameData.settings.bgMusic.useDefault || !gameData.settings.bgMusic.src) {
            bgAudio = new Audio(DEFAULT_BG_MUSIC);
            console.log('使用默认背景音乐:', DEFAULT_BG_MUSIC);
        } else {
            bgAudio = new Audio(gameData.settings.bgMusic.src);
            console.log('使用自定义背景音乐');
        }

        bgAudio.loop = true;
        bgAudio.volume = gameData.settings.bgMusic.volume / 100;
        bgAudio.preload = 'auto';

        // 添加音频事件监听
        bgAudio.addEventListener('canplaythrough', function () {
            console.log('背景音乐可以播放');
            audioState.bgAudioReady = true;
        });

        bgAudio.addEventListener('error', function (e) {
            console.error('背景音乐加载错误:', e);
            audioState.bgAudioReady = false;
            alert('背景音乐加载失败，请检查文件路径或格式');
        });

        bgAudio.addEventListener('ended', function () {
            console.log('背景音乐播放结束');
            audioState.bgMusicPlaying = false;
        });

    } catch (error) {
        console.error('创建背景音乐实例失败:', error);
        audioState.bgAudioReady = false;
    }

    try {
        if (gameData.settings.spinMusic.useDefault || !gameData.settings.spinMusic.src) {
            spinAudio = new Audio(DEFAULT_SPIN_SOUND);
            console.log('使用默认抽奖音效');
        } else {
            spinAudio = new Audio(gameData.settings.spinMusic.src);
            console.log('使用自定义抽奖音乐');
        }

        spinAudio.volume = gameData.settings.spinMusic.volume / 100;
        spinAudio.preload = 'auto';

        // 添加音频事件监听
        spinAudio.addEventListener('canplaythrough', function () {
            console.log('抽奖音乐可以播放');
            audioState.spinAudioReady = true;
        });

        spinAudio.addEventListener('error', function (e) {
            console.error('抽奖音乐加载错误:', e);
            audioState.spinAudioReady = false;
            alert('抽奖音乐加载失败，请检查文件路径或格式');
        });

        spinAudio.addEventListener('ended', function () {
            console.log('抽奖音乐播放结束');
            audioState.spinMusicPlaying = false;
            // 恢复背景音乐
            if (gameData.settings.bgMusic.enabled && audioState.userInteracted) {
                playBgMusic();
            }
        });

    } catch (error) {
        console.error('创建抽奖音乐实例失败:', error);
        audioState.spinAudioReady = false;
    }

    // 如果背景音乐已启用，尝试播放
    if (gameData.settings.bgMusic.enabled && audioState.userInteracted) {
        setTimeout(() => playBgMusic(), 500); // 延迟播放确保加载完成
    }
}

// 打开背景音乐设置模态框
function openBgMusicModal() {
    document.getElementById('bgMusicFile').value = '';
    document.getElementById('bgMusicVolume').value = gameData.settings.bgMusic.volume;
    document.getElementById('bgMusicVolumeValue').textContent = gameData.settings.bgMusic.volume + '%';
    document.getElementById('bgMusicEnabled').checked = gameData.settings.bgMusic.enabled;

    // 添加音量滑块事件监听
    document.getElementById('bgMusicVolume').addEventListener('input', function () {
        document.getElementById('bgMusicVolumeValue').textContent = this.value + '%';
    });

    document.getElementById('bgMusicModal').classList.add('active');
}

// 关闭背景音乐设置模态框
function closeBgMusicModal() {
    document.getElementById('bgMusicModal').classList.remove('active');
}

// 打开抽奖音乐设置模态框
function openSpinMusicModal() {
    document.getElementById('spinMusicFile').value = '';
    document.getElementById('spinMusicVolume').value = gameData.settings.spinMusic.volume;
    document.getElementById('spinMusicVolumeValue').textContent = gameData.settings.spinMusic.volume + '%';
    document.getElementById('spinMusicEnabled').checked = gameData.settings.spinMusic.enabled;

    // 添加音量滑块事件监听
    document.getElementById('spinMusicVolume').addEventListener('input', function () {
        document.getElementById('spinMusicVolumeValue').textContent = this.value + '%';
    });

    document.getElementById('spinMusicModal').classList.add('active');
}

// 关闭抽奖音乐设置模态框
function closeSpinMusicModal() {
    document.getElementById('spinMusicModal').classList.remove('active');
}

// 上传背景音乐
function uploadBgMusic() {
    const fileInput = document.getElementById('bgMusicFile');
    const file = fileInput.files[0];

    if (file) {
        // 检查文件类型
        if (!file.type.match('audio.*')) {
            alert('请选择音频文件！');
            return;
        }

        // 检查文件大小（限制为5MB）
        if (file.size > 5 * 1024 * 1024) {
            alert('音频文件大小不能超过5MB！');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            gameData.settings.bgMusic.src = e.target.result;
            gameData.settings.bgMusic.useDefault = false;
            saveData();

            // 重新初始化音频
            initAudioSettings();

            alert('背景音乐上传成功！');
        };
        reader.readAsDataURL(file);
    } else {
        alert('请选择一个音频文件');
    }
}

// 移除背景音乐
function removeBgMusic() {
    gameData.settings.bgMusic.src = null;
    gameData.settings.bgMusic.enabled = false;
    gameData.settings.bgMusic.useDefault = true;
    saveData();

    // 重新初始化音频
    initAudioSettings();

    alert('背景音乐已移除，已恢复默认设置');
}

// 恢复默认背景音乐
function resetBgMusic() {
    gameData.settings.bgMusic.src = null;
    gameData.settings.bgMusic.useDefault = true;
    saveData();

    // 重新初始化音频
    initAudioSettings();

    alert('已恢复默认背景音乐');
}

// 上传抽奖音乐
function uploadSpinMusic() {
    const fileInput = document.getElementById('spinMusicFile');
    const file = fileInput.files[0];

    if (file) {
        // 检查文件类型
        if (!file.type.match('audio.*')) {
            alert('请选择音频文件！');
            return;
        }

        // 检查文件大小（限制为5MB）
        if (file.size > 5 * 1024 * 1024) {
            alert('音频文件大小不能超过5MB！');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            gameData.settings.spinMusic.src = e.target.result;
            gameData.settings.spinMusic.useDefault = false;
            saveData();

            // 重新初始化音频
            initAudioSettings();

            alert('抽奖音乐上传成功！');
        };
        reader.readAsDataURL(file);
    } else {
        alert('请选择一个音频文件');
    }
}

// 移除抽奖音乐
function removeSpinMusic() {
    gameData.settings.spinMusic.src = null;
    gameData.settings.spinMusic.enabled = false;
    gameData.settings.spinMusic.useDefault = true;
    saveData();

    // 重新初始化音频
    initAudioSettings();

    alert('抽奖音乐已移除，已恢复默认设置');
}

// 恢复默认抽奖音效
function resetSpinMusic() {
    gameData.settings.spinMusic.src = null;
    gameData.settings.spinMusic.useDefault = true;
    saveData();

    // 重新初始化音频
    initAudioSettings();

    alert('已恢复默认抽奖音效');
}

// 保存背景音乐设置
function saveBgMusicSettings() {
    const volume = parseInt(document.getElementById('bgMusicVolume').value);
    const enabled = document.getElementById('bgMusicEnabled').checked;

    gameData.settings.bgMusic.volume = volume;
    gameData.settings.bgMusic.enabled = enabled;

    saveData();

    // 重新初始化音频设置
    initAudioSettings();

    // 根据设置播放或停止背景音乐
    if (enabled && audioState.userInteracted) {
        playBgMusic();
    } else {
        stopBgMusic();
    }

    alert('背景音乐设置已保存！');
    closeBgMusicModal();
}

// 保存抽奖音乐设置
function saveSpinMusicSettings() {
    const volume = parseInt(document.getElementById('spinMusicVolume').value);
    const enabled = document.getElementById('spinMusicEnabled').checked;

    gameData.settings.spinMusic.volume = volume;
    gameData.settings.spinMusic.enabled = enabled;

    saveData();

    // 重新初始化音频设置
    initAudioSettings();

    alert('抽奖音乐设置已保存！');
    closeSpinMusicModal();
}

// 改进的播放背景音乐函数
function playBgMusic() {
    if (!audioState.userInteracted) {
        console.log('等待用户交互后才能播放背景音乐');
        return;
    }

    if (!bgAudio || !audioState.bgAudioReady) {
        console.log('背景音乐未就绪');
        return;
    }

    if (!gameData.settings.bgMusic.enabled) {
        console.log('背景音乐已禁用');
        return;
    }

    // 确保没有其他背景音乐在播放
    if (audioState.bgMusicPlaying) {
        console.log('背景音乐已在播放');
        return;
    }

    // 确保抽奖音乐没有在播放
    if (audioState.spinMusicPlaying) {
        console.log('抽奖音乐正在播放，跳过背景音乐');
        return;
    }

    try {
        bgAudio.play().then(() => {
            audioState.bgMusicPlaying = true;
            console.log('背景音乐开始播放');
        }).catch(e => {
            console.error('背景音乐播放失败:', e);
            audioState.bgMusicPlaying = false;
            // 如果是自动播放策略阻止，等待用户交互
            if (e.name === 'NotAllowedError') {
                console.log('自动播放被阻止，等待用户交互');
                audioState.userInteracted = false;
            }
        });
    } catch (error) {
        console.error('播放背景音乐时发生错误:', error);
        audioState.bgMusicPlaying = false;
    }
}

// 改进的播放抽奖音乐函数
function playSpinMusic() {
    if (!audioState.userInteracted) {
        console.log('等待用户交互后才能播放抽奖音乐');
        return;
    }

    if (!spinAudio || !audioState.spinAudioReady) {
        console.log('抽奖音乐未就绪');
        return;
    }

    if (!gameData.settings.spinMusic.enabled) {
        console.log('抽奖音乐已禁用');
        return;
    }

    // 暂停背景音乐
    stopBgMusic();

    try {
        spinAudio.currentTime = 0;
        spinAudio.play().then(() => {
            audioState.spinMusicPlaying = true;
            console.log('抽奖音乐开始播放');
        }).catch(e => {
            console.error('抽奖音乐播放失败:', e);
            audioState.spinMusicPlaying = false;
            // 如果抽奖音乐播放失败，恢复背景音乐
            if (gameData.settings.bgMusic.enabled) {
                playBgMusic();
            }
        });
    } catch (error) {
        console.error('播放抽奖音乐时发生错误:', error);
        audioState.spinMusicPlaying = false;
        // 恢复背景音乐
        if (gameData.settings.bgMusic.enabled) {
            playBgMusic();
        }
    }
}

// 改进的停止背景音乐函数
function stopBgMusic() {
    if (bgAudio && audioState.bgMusicPlaying) {
        try {
            bgAudio.pause();
            bgAudio.currentTime = 0;
            audioState.bgMusicPlaying = false;
            console.log('背景音乐已停止');
        } catch (error) {
            console.error('停止背景音乐时发生错误:', error);
        }
    }
}

// 改进的停止抽奖音乐函数
function stopSpinMusic() {
    if (spinAudio && audioState.spinMusicPlaying) {
        try {
            spinAudio.pause();
            spinAudio.currentTime = 0;
            audioState.spinMusicPlaying = false;
            console.log('抽奖音乐已停止');
        } catch (error) {
            console.error('停止抽奖音乐时发生错误:', error);
        }
    }
}

// 添加强制停止所有音频的函数（用于调试）
function stopAllAudio() {
    stopBgMusic();
    stopSpinMusic();
    console.log('所有音频已停止');
}

// 在控制台显示音频状态
function logAudioState() {
    console.log('音频状态:', {
        userInteracted: audioState.userInteracted,
        bgMusicPlaying: audioState.bgMusicPlaying,
        spinMusicPlaying: audioState.spinMusicPlaying,
        bgAudioReady: audioState.bgAudioReady,
        spinAudioReady: audioState.spinAudioReady,
        bgMusicEnabled: gameData.settings.bgMusic.enabled,
        spinMusicEnabled: gameData.settings.spinMusic.enabled
    });
}

// 监听游戏模式切换
document.addEventListener('DOMContentLoaded', function () {
    const modeRadios = document.querySelectorAll('input[name="gameMode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            updatePlayerDisplay();
        });
    });

    // 新增：页面加载完成后延迟尝试播放背景音乐
    setTimeout(() => {
        if (audioState.userInteracted && gameData.settings.bgMusic.enabled) {
            playBgMusic();
        }
    }, 1000);
});
