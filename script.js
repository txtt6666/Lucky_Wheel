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
            avatar: null // 修改：将emoji改为avatar
        },
        player2: {
            name: '玩家2',
            avatar: null // 修改：将emoji改为avatar
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

window.onload = function() {
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
    return function() {
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
            { title: '对方为你唱一首情歌', desc: '选一首你最喜欢的情歌，让对方深情演唱', probability: 5, icon: '🎤' },
            { title: '今天所有餐由对方负责', desc: '今天的早午晚餐全部由对方安排和准备', probability: 3, icon: '🍽️' },
            { title: '获得15分钟肩颈按摩', desc: '享受对方温柔的肩颈按摩服务15分钟', probability: 4, icon: '💆' },
            { title: '对方为你泡一杯最爱的饮品', desc: '让对方为你精心调制一杯你最喜欢的饮品', probability: 6, icon: '☕' },
            { title: '一整天不许对你发脾气', desc: '今天对方必须保持温柔，不许生气或冷脸', probability: 2, icon: '😇' }
        ];

        // 😈 惩罚库
        const defaultPunishments = [
            // 搞怪类
            { title: '模仿动物叫声30秒', desc: '选择一种动物并逼真模仿它的叫声30秒', probability: 7, icon: '🐶' },
            { title: '做鬼脸拍照发给对方', desc: '做一个最搞怪的鬼脸并拍照留念发送', probability: 6, icon: '😜' },
            { title: '原地转圈20下', desc: '原地转圈20圈（注意安全，避免眩晕）', probability: 5, icon: '🔄' },
            { title: '单脚跳10步', desc: '用单脚连续跳10步不许停下', probability: 5, icon: '🦵' },
            { title: '模仿对方说话', desc: '模仿对方的语气和口头禅说话1分钟', probability: 8, icon: '🗣️' }
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
                    { title: '早安吻', desc: '给对方一个甜蜜的早安吻', probability: 6, icon: '💋' },
                    { title: '拥抱三分钟', desc: '给对方一个温暖的拥抱，持续三分钟', probability: 5, icon: '🤗' }
                ],
                punishments: [
                    { title: '撒娇道歉', desc: '用撒娇的方式向对方道歉', probability: 5, icon: '🥺' },
                    { title: '写情书', desc: '手写一封情书表达爱意', probability: 4, icon: '💌' }
                ]
            }
        ];
        
        // 生活小确幸模板
        gameData.templates.lifeBlessing = [
            {
                name: "家务分配",
                rewards: [
                    { title: '免做家务一天', desc: '今天可以不用做任何家务', probability: 4, icon: '🧹' },
                    { title: '早餐服务', desc: '对方为你准备丰盛的早餐', probability: 5, icon: '🍳' }
                ],
                punishments: [
                    { title: '洗碗一周', desc: '负责洗碗一周', probability: 5, icon: '🍽️' },
                    { title: '打扫卫生间', desc: '负责打扫卫生间', probability: 4, icon: '🚽' }
                ]
            },
            {
                name: "今日买单",
                rewards: [
                    { title: '晚餐免单', desc: '对方请你吃晚餐', probability: 3, icon: '🍕' },
                    { title: '电影票', desc: '对方请你看电影', probability: 4, icon: '🎬' }
                ],
                punishments: [
                    { title: '请客吃饭', desc: '请对方吃一顿饭', probability: 5, icon: '🍜' },
                    { title: '买零食', desc: '给对方买喜欢的零食', probability: 6, icon: '🍫' }
                ]
            }
        ];
        
        // 趣味挑战模板
        gameData.templates.funChallenge = [
            {
                name: "搞怪挑战",
                rewards: [
                    { title: '免惩罚券', desc: '获得一次免惩罚的机会', probability: 3, icon: '🆓' },
                    { title: '特权卡', desc: '可以要求对方做一件小事', probability: 4, icon: '🎫' }
                ],
                punishments: [
                    { title: '模仿表情包', desc: '模仿三个经典表情包', probability: 6, icon: '😜' },
                    { title: '倒立10秒', desc: '尝试倒立10秒钟', probability: 5, icon: '🤸' }
                ]
            },
            {
                name: "运动时间",
                rewards: [
                    { title: '休息特权', desc: '可以跳过今天的运动', probability: 4, icon: '🛌' },
                    { title: '按摩券', desc: '获得对方10分钟按摩', probability: 5, icon: '💆' }
                ],
                punishments: [
                    { title: '俯卧撑20个', desc: '做20个俯卧撑', probability: 5, icon: '🏋️' },
                    { title: '深蹲30个', desc: '做30个深蹲', probability: 6, icon: '🦵' }
                ]
            }
        ];
        
        // 浪漫瞬间模板
        gameData.templates.romanticMoment = [
            {
                name: "约会计划",
                rewards: [
                    { title: '浪漫晚餐', desc: '对方为你准备一顿浪漫的烛光晚餐', probability: 3, icon: '🕯️' },
                    { title: '电影之夜', desc: '一起看你最喜欢的电影', probability: 5, icon: '🎬' }
                ],
                punishments: [
                    { title: '策划约会', desc: '策划一次完美的约会', probability: 4, icon: '📅' },
                    { title: '写情诗', desc: '为对方写一首情诗', probability: 5, icon: '📝' }
                ]
            },
            {
                name: "爱的表达",
                rewards: [
                    { title: '爱的告白', desc: '听对方深情告白三分钟', probability: 4, icon: '💝' },
                    { title: '拥抱时间', desc: '获得对方长时间的拥抱', probability: 6, icon: '🤗' }
                ],
                punishments: [
                    { title: '表达爱意', desc: '用五种不同方式表达爱意', probability: 5, icon: '💖' },
                    { title: '回忆甜蜜', desc: '分享三个最甜蜜的回忆', probability: 6, icon: '📔' }
                ]
            }
        ];
        
        // 情趣游戏模板
        gameData.templates.intimateGame = [
            {
                name: "酒桌小游戏",
                rewards: [
                    { title: '交杯酒', desc: '和对方喝交杯酒', probability: 5, icon: '💋' },
                    { title: '按摩时间', desc: '享受对方全身按摩15分钟', probability: 4, icon: '💆' }
                ],
                punishments: [
                    { title: '亲密任务', desc: '完成一个亲密小任务', probability: 6, icon: '🔞' },
                    { title: '真心话', desc: '回答一个私密问题', probability: 5, icon: '🗣️' }
                ]
            },
            {
                name: "亲密互动",
                rewards: [
                    { title: '亲吻特权', desc: '可以随时亲吻对方', probability: 5, icon: '💋' },
                    { title: '按摩时间', desc: '享受对方全身按摩15分钟', probability: 4, icon: '💆' }
                ],
                punishments: [
                    { title: '亲密任务', desc: '完成一个亲密小任务', probability: 6, icon: '🔞' },
                    { title: '真心话', desc: '回答一个私密问题', probability: 5, icon: '🗣️' }
                ]
            }
        ];

        // 新增：合作模式模板
        gameData.templates.coopMode = [
            {
                name: "双人游戏",
                rewards: [
                    { title: '一起完成拼图', desc: '合作完成1000片拼图', probability: 5, icon: '🧩' },
                    { title: '双人瑜伽挑战', desc: '一起完成一组双人瑜伽动作', probability: 4, icon: '🧘' },
                    { title: '情侣舞蹈', desc: '学习并跳一支情侣舞蹈', probability: 6, icon: '💃' },
                    { title: '合作烹饪', desc: '一起制作一顿丰盛的晚餐', probability: 5, icon: '👨‍🍳' },
                    { title: '双人游戏通关', desc: '合作通关一个双人游戏关卡', probability: 7, icon: '🎮' }
                ],
                punishments: [
                    { title: '双人俯卧撑', desc: '一起做20个俯卧撑', probability: 6, icon: '🏋️' },
                    { title: '默契考验失败', desc: '重新进行默契测试直到及格', probability: 5, icon: '❌' },
                    { title: '双人清洁任务', desc: '一起打扫整个房间', probability: 4, icon: '🧹' },
                    { title: '合作绘画', desc: '共同完成一幅画作', probability: 7, icon: '🎨' },
                    { title: '双人运动挑战', desc: '完成一组双人运动训练', probability: 5, icon: '⚽' }
                ]
            },
            {
                name: "情侣挑战",
                rewards: [
                    { title: '情侣按摩', desc: '互相为对方按摩15分钟', probability: 6, icon: '💆' },
                    { title: '双人SPA体验', desc: '一起享受居家SPA时光', probability: 4, icon: '🛁' },
                    { title: '情侣写真', desc: '拍摄一组情侣照片', probability: 5, icon: '📸' }
                ],
                punishments: [
                    { title: '双人家务', desc: '一起完成所有家务', probability: 5, icon: '🏠' },
                    { title: '情侣健身', desc: '一起完成30分钟健身', probability: 6, icon: '💪' },
                    { title: '合作学习', desc: '共同学习一项新技能', probability: 4, icon: '📚' }
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
    
    if (gameMode === 'coop') {
        // 合作模式下显示两个玩家
        const player1Avatar = gameData.players.player1.avatar ? 
            `<img class="player-avatar" src="${gameData.players.player1.avatar}" alt="${gameData.players.player1.name}">` : 
            `<div class="player-avatar default-avatar">${gameData.players.player1.name.charAt(0)}</div>`;
            
        const player2Avatar = gameData.players.player2.avatar ? 
            `<img class="player-avatar" src="${gameData.players.player2.avatar}" alt="${gameData.players.player2.name}">` : 
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
        const playerAvatar = currentPlayerData.avatar ? 
            `<img class="player-avatar" src="${currentPlayerData.avatar}" alt="${currentPlayerData.name}">` : 
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
        gameData = {...gameData, ...parsedData};
        
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
    
    if (gameData.players.player1.avatar) {
        player1AvatarPreview.src = gameData.players.player1.avatar;
    } else {
        player1AvatarPreview.src = '';
        player1AvatarPreview.alt = '玩家1头像预览';
    }
    
    if (gameData.players.player2.avatar) {
        player2AvatarPreview.src = gameData.players.player2.avatar;
    } else {
        player2AvatarPreview.src = '';
        player2AvatarPreview.alt = '玩家2头像预览';
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
    reader.onload = function(e) {
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
        reader.onload = function(e) {
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
        switch(category) {
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
        bgAudio.addEventListener('canplaythrough', function() {
            console.log('背景音乐可以播放');
            audioState.bgAudioReady = true;
        });
        
        bgAudio.addEventListener('error', function(e) {
            console.error('背景音乐加载错误:', e);
            audioState.bgAudioReady = false;
            alert('背景音乐加载失败，请检查文件路径或格式');
        });
        
        bgAudio.addEventListener('ended', function() {
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
        spinAudio.addEventListener('canplaythrough', function() {
            console.log('抽奖音乐可以播放');
            audioState.spinAudioReady = true;
        });
        
        spinAudio.addEventListener('error', function(e) {
            console.error('抽奖音乐加载错误:', e);
            audioState.spinAudioReady = false;
            alert('抽奖音乐加载失败，请检查文件路径或格式');
        });
        
        spinAudio.addEventListener('ended', function() {
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
    document.getElementById('bgMusicVolume').addEventListener('input', function() {
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
    document.getElementById('spinMusicVolume').addEventListener('input', function() {
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
        reader.onload = function(e) {
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
        reader.onload = function(e) {
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
document.addEventListener('DOMContentLoaded', function() {
    const modeRadios = document.querySelectorAll('input[name="gameMode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
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
