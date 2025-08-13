// SmartTrade AI Marketing Site JavaScript
// Conversion-optimized interactions and analytics

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================================================
    // NAVIGATION & MOBILE MENU
    // ============================================================================
    
    const navbar = document.querySelector('.navbar');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
    }
    
    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                if (navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    mobileMenuToggle.classList.remove('active');
                    document.body.classList.remove('menu-open');
                }
            }
        });
    });
    
    // ============================================================================
    // PRICING TOGGLE
    // ============================================================================
    
    const pricingToggle = document.getElementById('pricing-toggle');
    const priceAmounts = document.querySelectorAll('.price-amount');
    
    if (pricingToggle) {
        pricingToggle.addEventListener('change', function() {
            const isYearly = this.checked;
            
            priceAmounts.forEach(amount => {
                const monthlyPrice = amount.getAttribute('data-monthly');
                const yearlyPrice = amount.getAttribute('data-yearly');
                
                if (monthlyPrice && yearlyPrice) {
                    amount.textContent = isYearly ? `$${yearlyPrice}` : `$${monthlyPrice}`;
                }
            });
            
            // Track pricing toggle event
            trackEvent('pricing_toggle', {
                billing_period: isYearly ? 'yearly' : 'monthly'
            });
        });
    }
    
    // ============================================================================
    // MODAL FUNCTIONALITY
    // ============================================================================
    
    const demoModal = document.getElementById('demo-modal');
    const watchDemoBtn = document.getElementById('watch-demo');
    const modalClose = document.querySelector('.modal-close');
    
    // Open demo modal
    if (watchDemoBtn) {
        watchDemoBtn.addEventListener('click', () => {
            demoModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            trackEvent('demo_modal_opened', {
                source: 'hero_button'
            });
        });
    }
    
    // Close modal
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    // Close modal on background click
    if (demoModal) {
        demoModal.addEventListener('click', (e) => {
            if (e.target === demoModal) {
                closeModal();
            }
        });
    }
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && demoModal.classList.contains('active')) {
            closeModal();
        }
    });
    
    function closeModal() {
        demoModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Pause video if it's playing
        const iframe = demoModal.querySelector('iframe');
        if (iframe) {
            const src = iframe.src;
            iframe.src = '';
            iframe.src = src;
        }
    }
    
    // ============================================================================
    // CTA BUTTON TRACKING & REDIRECTS
    // ============================================================================
    
    // Track all CTA button clicks
    const ctaButtons = [
        'get-started-nav',
        'get-started-hero', 
        'get-started-how-it-works',
        'final-cta-btn',
        'free-trial-btn',
        'smart-trader-btn',
        'pro-trader-btn'
    ];
    
    ctaButtons.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => {
                const buttonText = button.textContent.trim();
                const section = getButtonSection(id);
                
                trackEvent('cta_click', {
                    button_id: id,
                    button_text: buttonText,
                    section: section,
                    timestamp: new Date().toISOString()
                });
                
                // Redirect to registration/app
                setTimeout(() => {
                    window.location.href = getRedirectUrl(id);
                }, 100);
            });
        }
    });
    
    // Schedule demo button
    const scheduleDemoBtn = document.getElementById('schedule-demo-btn');
    if (scheduleDemoBtn) {
        scheduleDemoBtn.addEventListener('click', () => {
            trackEvent('schedule_demo_click', {
                source: 'final_cta'
            });
            
            // Open Calendly or demo scheduling
            window.open('https://calendly.com/smarttrade-demo', '_blank');
        });
    }
    
    // Login link
    const loginLink = document.getElementById('login-link');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            trackEvent('login_click', {
                source: 'navigation'
            });
            
            window.location.href = '/login';
        });
    }
    
    function getButtonSection(buttonId) {
        const sectionMap = {
            'get-started-nav': 'navigation',
            'get-started-hero': 'hero',
            'get-started-how-it-works': 'how_it_works',
            'final-cta-btn': 'final_cta',
            'free-trial-btn': 'pricing',
            'smart-trader-btn': 'pricing',
            'pro-trader-btn': 'pricing'
        };
        return sectionMap[buttonId] || 'unknown';
    }
    
    function getRedirectUrl(buttonId) {
        // Customize based on button type
        const urlMap = {
            'free-trial-btn': '/register?plan=free',
            'smart-trader-btn': '/register?plan=smart',
            'pro-trader-btn': '/register?plan=pro'
        };
        return urlMap[buttonId] || '/register';
    }
    
    // ============================================================================
    // SCROLL ANIMATIONS
    // ============================================================================
    
    // Intersection Observer for scroll animations
    const animateOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                // Track section views for analytics
                const sectionName = entry.target.id || entry.target.className.split(' ')[0];
                trackEvent('section_view', {
                    section: sectionName,
                    scroll_depth: Math.round((window.scrollY / document.body.scrollHeight) * 100)
                });
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe sections for animations
    document.querySelectorAll('section').forEach(section => {
        animateOnScroll.observe(section);
    });
    
    // ============================================================================
    // FORM HANDLING (if needed for newsletter, contact, etc.)
    // ============================================================================
    
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    
    function handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const formType = form.getAttribute('data-form-type') || 'unknown';
        
        trackEvent('form_submit', {
            form_type: formType,
            fields: Array.from(formData.keys())
        });
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Please wait...';
        submitBtn.disabled = true;
        
        // Simulate form submission (replace with actual API call)
        setTimeout(() => {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Show success message
            showNotification('Thank you! We\'ll be in touch soon.', 'success');
            
            // Reset form
            form.reset();
        }, 1500);
    }
    
    // ============================================================================
    // SCROLL DEPTH TRACKING
    // ============================================================================
    
    let maxScrollDepth = 0;
    const scrollMilestones = [25, 50, 75, 90, 100];
    const trackedMilestones = new Set();
    
    window.addEventListener('scroll', throttle(() => {
        const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        
        if (scrollDepth > maxScrollDepth) {
            maxScrollDepth = scrollDepth;
            
            // Track milestone scrolls
            scrollMilestones.forEach(milestone => {
                if (scrollDepth >= milestone && !trackedMilestones.has(milestone)) {
                    trackedMilestones.add(milestone);
                    trackEvent('scroll_depth', {
                        depth: milestone,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }
    }, 1000));
    
    // ============================================================================
    // TESTIMONIAL ROTATION (if needed)
    // ============================================================================
    
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    if (testimonialCards.length > 3) {
        let currentTestimonial = 0;
        
        setInterval(() => {
            testimonialCards.forEach((card, index) => {
                card.style.display = index >= currentTestimonial && index < currentTestimonial + 3 ? 'block' : 'none';
            });
            
            currentTestimonial = (currentTestimonial + 3) % testimonialCards.length;
        }, 5000);
    }
    
    // ============================================================================
    // FEATURE HIGHLIGHTS
    // ============================================================================
    
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const featureName = card.querySelector('.feature-title').textContent;
            trackEvent('feature_hover', {
                feature: featureName
            });
        });
    });
    
    // ============================================================================
    // EXIT INTENT DETECTION
    // ============================================================================
    
    let exitIntentShown = false;
    
    document.addEventListener('mouseleave', (e) => {
        if (e.clientY <= 0 && !exitIntentShown && !localStorage.getItem('exit_intent_shown')) {
            exitIntentShown = true;
            showExitIntent();
            localStorage.setItem('exit_intent_shown', 'true');
        }
    });
    
    function showExitIntent() {
        // Create exit intent modal
        const exitModal = document.createElement('div');
        exitModal.className = 'modal active';
        exitModal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <h3>Wait! Don't miss out on your free trial</h3>
                <p>Get 30 days free access to institutional-grade trading algorithms. No credit card required.</p>
                <div style="margin-top: 2rem;">
                    <button class="btn btn-primary btn-large" id="exit-intent-cta">
                        Start Free Trial Now
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(exitModal);
        document.body.style.overflow = 'hidden';
        
        // Handle exit intent CTA
        exitModal.querySelector('#exit-intent-cta').addEventListener('click', () => {
            trackEvent('exit_intent_conversion', {
                timestamp: new Date().toISOString()
            });
            window.location.href = '/register?source=exit_intent';
        });
        
        // Handle close
        exitModal.querySelector('.modal-close').addEventListener('click', () => {
            exitModal.remove();
            document.body.style.overflow = 'auto';
        });
        
        trackEvent('exit_intent_shown', {
            timestamp: new Date().toISOString()
        });
    }
    
    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    
    // Throttle function for scroll events
    function throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#059669' : '#1E40AF'};
            color: white;
            padding: 1rem;
            border-radius: 0.75rem;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // ============================================================================
    // ANALYTICS & TRACKING
    // ============================================================================
    
    function trackEvent(eventName, properties = {}) {
        // Google Analytics 4
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                ...properties,
                page_title: document.title,
                page_location: window.location.href
            });
        }
        
        // Facebook Pixel (if needed)
        if (typeof fbq !== 'undefined') {
            fbq('trackCustom', eventName, properties);
        }
        
        // Other analytics platforms can be added here
        
        // Console log for development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Event tracked:', eventName, properties);
        }
    }
    
    // Track page view
    trackEvent('page_view', {
        page_type: 'landing_page',
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`
    });
    
    // Track session duration
    const sessionStart = Date.now();
    window.addEventListener('beforeunload', () => {
        const sessionDuration = Math.round((Date.now() - sessionStart) / 1000);
        trackEvent('session_end', {
            duration_seconds: sessionDuration,
            max_scroll_depth: maxScrollDepth
        });
    });
    
    // ============================================================================
    // PERFORMANCE MONITORING
    // ============================================================================
    
    // Track page load performance
    window.addEventListener('load', () => {
        setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const paintEntries = performance.getEntriesByType('paint');
            
            trackEvent('page_performance', {
                load_time: Math.round(navigation.loadEventEnd - navigation.fetchStart),
                dom_content_loaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
                first_paint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
                first_contentful_paint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
            });
        }, 0);
    });
    
    // ============================================================================
    // ERROR HANDLING
    // ============================================================================
    
    window.addEventListener('error', (e) => {
        trackEvent('javascript_error', {
            message: e.message,
            filename: e.filename,
            line: e.lineno,
            column: e.colno,
            stack: e.error?.stack
        });
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        trackEvent('promise_rejection', {
            reason: e.reason?.toString() || 'Unknown promise rejection'
        });
    });
    
    // ============================================================================
    // ACCESSIBILITY ENHANCEMENTS
    // ============================================================================
    
    // Keyboard navigation for custom elements
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const target = e.target;
            if (target.classList.contains('mobile-menu-toggle')) {
                e.preventDefault();
                target.click();
            }
        }
    });
    
    // Focus management for modal
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    function trapFocus(element) {
        const focusableContent = element.querySelectorAll(focusableElements);
        const firstFocusableElement = focusableContent[0];
        const lastFocusableElement = focusableContent[focusableContent.length - 1];
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableElement) {
                        lastFocusableElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusableElement) {
                        firstFocusableElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
        
        firstFocusableElement.focus();
    }
    
    // Initialize focus trap when modal opens
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const modal = mutation.target;
                if (modal.classList.contains('active') && modal.classList.contains('modal')) {
                    trapFocus(modal);
                }
            }
        });
    });
    
    if (demoModal) {
        observer.observe(demoModal, { attributes: true });
    }
    
    console.log('SmartTrade AI marketing site loaded successfully! 🚀');
});

// ============================================================================
// CSS ANIMATION CLASSES (to be added via CSS)
// ============================================================================

// Add animation styles to document head
const animationStyles = `
<style>
.animate-in {
    animation: slideInUp 0.6s ease-out forwards;
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.notification {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
    .notification {
        left: 20px;
        right: 20px;
        transform: translateY(-100%);
    }
    
    .notification.show {
        transform: translateY(0);
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', animationStyles);
