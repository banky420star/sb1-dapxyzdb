#!/bin/bash
# Interview Preparation Assistant with Codex CLI
# Helps prepare for technical interviews with practice problems and mock interviews

set -e

# ============================================
# Configuration
# ============================================
CODEX_CMD="codex"
PREP_DIR="${HOME}/.codex/interview-prep"
SESSION_DIR="${PREP_DIR}/sessions/$(date +'%Y-%m-%d-%H%M%S')"
PROGRESS_FILE="${PREP_DIR}/progress.json"

# Create directories
mkdir -p "$SESSION_DIR"
mkdir -p "${PREP_DIR}/solutions"
mkdir -p "${PREP_DIR}/notes"

# ============================================
# Helper Functions
# ============================================

show_menu() {
    clear
    echo "╔══════════════════════════════════════════════╗"
    echo "║     Codex Interview Preparation Assistant    ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""
    echo "1. 📝 Coding Challenge Practice"
    echo "2. 🏗️  System Design Interview"
    echo "3. 💬 Behavioral Interview Practice"
    echo "4. 📚 Data Structures & Algorithms Review"
    echo "5. 🔍 Code Review & Optimization"
    echo "6. 🎯 Company-Specific Preparation"
    echo "7. 📊 Mock Interview (Full Session)"
    echo "8. 📈 Review Progress & Stats"
    echo "9. 💡 Interview Tips & Best Practices"
    echo "0. 🚪 Exit"
    echo ""
    echo -n "Select an option: "
}

# ============================================
# Practice Modules
# ============================================

# 1. Coding Challenge Practice
coding_challenge() {
    echo "Select difficulty level:"
    echo "1. Easy"
    echo "2. Medium"
    echo "3. Hard"
    echo -n "Choice: "
    read difficulty
    
    case $difficulty in
        1) LEVEL="easy";;
        2) LEVEL="medium";;
        3) LEVEL="hard";;
        *) LEVEL="medium";;
    esac
    
    echo "Select topic:"
    echo "1. Arrays & Strings"
    echo "2. Linked Lists"
    echo "3. Trees & Graphs"
    echo "4. Dynamic Programming"
    echo "5. Sorting & Searching"
    echo "6. Recursion & Backtracking"
    echo "7. Random Topic"
    echo -n "Choice: "
    read topic_choice
    
    case $topic_choice in
        1) TOPIC="arrays and strings";;
        2) TOPIC="linked lists";;
        3) TOPIC="trees and graphs";;
        4) TOPIC="dynamic programming";;
        5) TOPIC="sorting and searching";;
        6) TOPIC="recursion and backtracking";;
        *) TOPIC="any topic";;
    esac
    
    PROBLEM_FILE="${SESSION_DIR}/problem-${LEVEL}-$(date +'%H%M%S').md"
    
    $CODEX_CMD "Generate a $LEVEL difficulty coding problem about $TOPIC similar to LeetCode/HackerRank.
    Include:
    1. Problem statement
    2. Examples with input/output
    3. Constraints
    4. Hints (hidden initially)
    5. Follow-up questions
    
    Format as markdown" > "$PROBLEM_FILE"
    
    echo ""
    echo "Problem saved to: $PROBLEM_FILE"
    echo ""
    cat "$PROBLEM_FILE"
    echo ""
    echo "Press Enter when ready to see the solution approach..."
    read
    
    SOLUTION_FILE="${SESSION_DIR}/solution-${LEVEL}-$(date +'%H%M%S').md"
    
    $CODEX_CMD "For the problem in $PROBLEM_FILE, provide:
    1. Solution approach explanation
    2. Time and space complexity analysis
    3. Code implementation in Python and JavaScript
    4. Test cases
    5. Common mistakes to avoid
    6. Optimization possibilities" > "$SOLUTION_FILE"
    
    cat "$SOLUTION_FILE"
    
    # Log progress
    echo "{\"date\": \"$(date)\", \"type\": \"coding\", \"level\": \"$LEVEL\", \"topic\": \"$TOPIC\"}" >> "${PREP_DIR}/practice-log.jsonl"
}

# 2. System Design Interview
system_design() {
    echo "Select system type:"
    echo "1. URL Shortener (e.g., bit.ly)"
    echo "2. Social Media Feed"
    echo "3. Video Streaming Platform"
    echo "4. Ride Sharing Service"
    echo "5. Payment System"
    echo "6. Chat Application"
    echo "7. Search Engine"
    echo "8. Custom (enter your own)"
    echo -n "Choice: "
    read system_choice
    
    case $system_choice in
        1) SYSTEM="URL shortener like bit.ly";;
        2) SYSTEM="social media feed like Twitter";;
        3) SYSTEM="video streaming platform like YouTube";;
        4) SYSTEM="ride sharing service like Uber";;
        5) SYSTEM="payment system like Stripe";;
        6) SYSTEM="chat application like WhatsApp";;
        7) SYSTEM="search engine like Google";;
        8) 
            echo -n "Enter system to design: "
            read SYSTEM
            ;;
        *) SYSTEM="distributed cache";;
    esac
    
    DESIGN_FILE="${SESSION_DIR}/system-design-$(date +'%H%M%S').md"
    
    $CODEX_CMD "Help me design a $SYSTEM. Structure the response as a system design interview:
    
    1. Requirements Gathering
       - Functional requirements
       - Non-functional requirements
       - Scale estimates
    
    2. High-Level Design
       - Architecture overview
       - Major components
       - Data flow
    
    3. Detailed Design
       - API design
       - Database schema
       - Algorithm choices
    
    4. Scale & Performance
       - Bottlenecks
       - Caching strategy
       - Load balancing
    
    5. Reliability & Availability
       - Failure scenarios
       - Backup strategies
       - Monitoring
    
    6. Trade-offs & Alternatives
    
    Include ASCII diagrams where helpful" > "$DESIGN_FILE"
    
    echo ""
    cat "$DESIGN_FILE"
    echo ""
    echo "Design saved to: $DESIGN_FILE"
    
    # Follow-up questions
    echo ""
    echo "Would you like to dive deeper into any aspect? (y/n)"
    read -n 1 followup
    if [ "$followup" = "y" ]; then
        echo ""
        echo "Enter your follow-up question:"
        read question
        $CODEX_CMD "$question (in context of the $SYSTEM design)"
    fi
}

# 3. Behavioral Interview Practice
behavioral_interview() {
    echo "Select question category:"
    echo "1. Leadership & Initiative"
    echo "2. Teamwork & Collaboration"
    echo "3. Problem Solving"
    echo "4. Conflict Resolution"
    echo "5. Career Goals"
    echo "6. Failure & Learning"
    echo "7. Technical Challenges"
    echo "8. Random Mix"
    echo -n "Choice: "
    read category
    
    case $category in
        1) CAT="leadership and initiative";;
        2) CAT="teamwork and collaboration";;
        3) CAT="problem solving";;
        4) CAT="conflict resolution";;
        5) CAT="career goals and motivation";;
        6) CAT="failure and learning";;
        7) CAT="technical challenges";;
        *) CAT="various categories";;
    esac
    
    BEHAVIORAL_FILE="${SESSION_DIR}/behavioral-$(date +'%H%M%S').md"
    
    $CODEX_CMD "Generate 5 behavioral interview questions about $CAT.
    For each question provide:
    1. The question
    2. What the interviewer is looking for
    3. STAR method template answer
    4. Example strong answer
    5. Common pitfalls to avoid
    6. Follow-up questions to expect" > "$BEHAVIORAL_FILE"
    
    cat "$BEHAVIORAL_FILE"
    echo ""
    echo "Questions saved to: $BEHAVIORAL_FILE"
}

# 4. Data Structures & Algorithms Review
ds_algo_review() {
    echo "Select topic to review:"
    echo "1. Big O Notation"
    echo "2. Arrays & Strings"
    echo "3. Hash Tables"
    echo "4. Linked Lists"
    echo "5. Stacks & Queues"
    echo "6. Trees (Binary, BST, AVL)"
    echo "7. Graphs"
    echo "8. Heaps"
    echo "9. Dynamic Programming"
    echo "10. Sorting Algorithms"
    echo -n "Choice: "
    read topic
    
    case $topic in
        1) TOPIC="Big O notation and complexity analysis";;
        2) TOPIC="Arrays and string manipulation";;
        3) TOPIC="Hash tables and hash maps";;
        4) TOPIC="Linked lists (singly, doubly, circular)";;
        5) TOPIC="Stacks and queues";;
        6) TOPIC="Trees including binary trees, BST, and AVL trees";;
        7) TOPIC="Graphs and graph algorithms";;
        8) TOPIC="Heaps and priority queues";;
        9) TOPIC="Dynamic programming";;
        10) TOPIC="Sorting algorithms";;
        *) TOPIC="common data structures";;
    esac
    
    REVIEW_FILE="${SESSION_DIR}/review-$(date +'%H%M%S').md"
    
    $CODEX_CMD "Create a comprehensive review of $TOPIC for interview preparation.
    Include:
    1. Core concepts and definitions
    2. Common operations and their complexities
    3. Implementation in Python and JavaScript
    4. Common interview problems using this topic
    5. Tips and tricks
    6. Comparison with related data structures
    7. Practice problems with solutions" > "$REVIEW_FILE"
    
    cat "$REVIEW_FILE"
    echo ""
    echo "Review saved to: $REVIEW_FILE"
}

# 5. Code Review & Optimization
code_review_practice() {
    echo "Paste your code (press Ctrl+D when done):"
    CODE_FILE="${SESSION_DIR}/code-to-review.txt"
    cat > "$CODE_FILE"
    
    REVIEW_FILE="${SESSION_DIR}/code-review-$(date +'%H%M%S').md"
    
    $CODEX_CMD "Review this code as if you're a senior engineer in an interview:
    
    $(cat $CODE_FILE)
    
    Provide:
    1. Overall assessment
    2. Bugs and potential issues
    3. Performance optimizations
    4. Code style and readability improvements
    5. Best practices violations
    6. Security concerns
    7. Test coverage suggestions
    8. Refactored version of the code
    9. Questions you would ask the candidate" > "$REVIEW_FILE"
    
    cat "$REVIEW_FILE"
    echo ""
    echo "Review saved to: $REVIEW_FILE"
}

# 6. Company-Specific Preparation
company_prep() {
    echo -n "Enter company name: "
    read COMPANY
    
    echo "Select preparation type:"
    echo "1. Company research & culture"
    echo "2. Common interview questions"
    echo "3. Technical stack preparation"
    echo "4. System design topics"
    echo "5. Full preparation package"
    echo -n "Choice: "
    read prep_type
    
    COMPANY_FILE="${SESSION_DIR}/company-prep-$(date +'%H%M%S').md"
    
    case $prep_type in
        1)
            $CODEX_CMD "Research $COMPANY and provide:
            1. Company mission and values
            2. Engineering culture
            3. Recent technical blog posts or innovations
            4. Questions to ask interviewers
            5. How to align your experience with their needs" > "$COMPANY_FILE"
            ;;
        2)
            $CODEX_CMD "List common interview questions asked at $COMPANY:
            1. Coding challenge patterns
            2. System design topics
            3. Behavioral questions
            4. Technical deep-dives
            Based on Glassdoor, LeetCode discussions, and common patterns" > "$COMPANY_FILE"
            ;;
        3)
            $CODEX_CMD "Prepare for $COMPANY's technical stack:
            1. Main programming languages used
            2. Frameworks and tools
            3. Infrastructure and cloud services
            4. Key technical concepts to review
            5. Sample problems using their stack" > "$COMPANY_FILE"
            ;;
        4)
            $CODEX_CMD "System design topics relevant to $COMPANY:
            1. Products they build
            2. Scale challenges they face
            3. Relevant system design questions
            4. Their engineering blog insights
            5. Architecture patterns they use" > "$COMPANY_FILE"
            ;;
        5)
            $CODEX_CMD "Complete interview preparation guide for $COMPANY:
            1. Company overview and culture
            2. Interview process and stages
            3. Common coding questions (with patterns)
            4. System design focus areas
            5. Behavioral questions to expect
            6. Technical stack to review
            7. Questions to ask interviewers
            8. Salary negotiation tips
            9. Red flags and green flags
            10. Success stories and tips from employees" > "$COMPANY_FILE"
            ;;
    esac
    
    cat "$COMPANY_FILE"
    echo ""
    echo "Preparation saved to: $COMPANY_FILE"
}

# 7. Mock Interview
mock_interview() {
    echo "Starting Mock Interview Session..."
    echo "Duration: ~45 minutes"
    echo ""
    
    MOCK_FILE="${SESSION_DIR}/mock-interview-$(date +'%H%M%S').md"
    
    # Introduction
    echo "=== Introduction Phase (2 minutes) ===" | tee "$MOCK_FILE"
    $CODEX_CMD "Generate a brief introduction question for a technical interview" | tee -a "$MOCK_FILE"
    echo ""
    echo "Take 2 minutes to prepare your introduction..."
    sleep 120
    
    # Coding Challenge
    echo "" | tee -a "$MOCK_FILE"
    echo "=== Coding Challenge (20 minutes) ===" | tee -a "$MOCK_FILE"
    $CODEX_CMD "Generate a medium difficulty coding problem suitable for a 20-minute interview" | tee -a "$MOCK_FILE"
    echo ""
    echo "You have 20 minutes. Press Enter when ready to continue..."
    read
    
    # System Design
    echo "" | tee -a "$MOCK_FILE"
    echo "=== System Design (15 minutes) ===" | tee -a "$MOCK_FILE"
    $CODEX_CMD "Generate a mini system design question suitable for 15 minutes" | tee -a "$MOCK_FILE"
    echo ""
    echo "You have 15 minutes. Press Enter when ready to continue..."
    read
    
    # Behavioral
    echo "" | tee -a "$MOCK_FILE"
    echo "=== Behavioral Questions (5 minutes) ===" | tee -a "$MOCK_FILE"
    $CODEX_CMD "Generate 2 behavioral questions for a technical interview" | tee -a "$MOCK_FILE"
    echo ""
    echo "You have 5 minutes. Press Enter when ready to continue..."
    read
    
    # Questions for Interviewer
    echo "" | tee -a "$MOCK_FILE"
    echo "=== Your Questions (3 minutes) ===" | tee -a "$MOCK_FILE"
    echo "What questions would you ask the interviewer?" | tee -a "$MOCK_FILE"
    echo ""
    
    # Feedback
    echo "Mock interview complete! Generating feedback..."
    $CODEX_CMD "Provide feedback on a typical interview performance covering:
    1. Strengths demonstrated
    2. Areas for improvement
    3. Communication tips
    4. Problem-solving approach
    5. Next steps for preparation" | tee -a "$MOCK_FILE"
    
    echo ""
    echo "Full session saved to: $MOCK_FILE"
}

# 8. Progress Review
progress_review() {
    echo "=== Interview Preparation Progress ==="
    echo ""
    
    if [ -f "${PREP_DIR}/practice-log.jsonl" ]; then
        echo "Practice Statistics:"
        echo "-------------------"
        TOTAL=$(wc -l < "${PREP_DIR}/practice-log.jsonl")
        echo "Total practice sessions: $TOTAL"
        
        echo ""
        echo "Recent Sessions:"
        tail -5 "${PREP_DIR}/practice-log.jsonl" | while read line; do
            echo "  - $line"
        done
    else
        echo "No practice sessions recorded yet."
    fi
    
    echo ""
    echo "Session Files:"
    ls -la "${PREP_DIR}/sessions/" 2>/dev/null | tail -10 || echo "No sessions found."
    
    echo ""
    echo "Would you like personalized study recommendations? (y/n)"
    read -n 1 recommend
    if [ "$recommend" = "y" ]; then
        echo ""
        $CODEX_CMD "Based on common interview preparation patterns, suggest a 
        2-week study plan covering:
        1. Daily practice schedule
        2. Topics to focus on
        3. Resources to use
        4. Mock interview schedule
        5. Final week preparation tips"
    fi
}

# 9. Interview Tips
interview_tips() {
    echo "Select tip category:"
    echo "1. Before the interview"
    echo "2. During coding challenges"
    echo "3. System design approach"
    echo "4. Behavioral responses"
    echo "5. Virtual interview tips"
    echo "6. Negotiation advice"
    echo "7. All tips"
    echo -n "Choice: "
    read tip_choice
    
    case $tip_choice in
        1) TIPS="before the interview preparation";;
        2) TIPS="during coding challenges";;
        3) TIPS="system design interview approach";;
        4) TIPS="behavioral interview responses";;
        5) TIPS="virtual/remote interview";;
        6) TIPS="salary and offer negotiation";;
        *) TIPS="all aspects of technical interviews";;
    esac
    
    $CODEX_CMD "Provide comprehensive interview tips for $TIPS including:
    1. Do's and don'ts
    2. Common mistakes to avoid
    3. Pro tips from experienced interviewers
    4. Body language and communication
    5. Handling pressure and nerves
    6. Recovery strategies when stuck"
}

# ============================================
# Main Loop
# ============================================

while true; do
    show_menu
    read choice
    
    case $choice in
        1) coding_challenge;;
        2) system_design;;
        3) behavioral_interview;;
        4) ds_algo_review;;
        5) code_review_practice;;
        6) company_prep;;
        7) mock_interview;;
        8) progress_review;;
        9) interview_tips;;
        0) 
            echo "Good luck with your interviews! 🚀"
            exit 0
            ;;
        *)
            echo "Invalid option. Please try again."
            sleep 2
            ;;
    esac
    
    echo ""
    echo "Press Enter to continue..."
    read
done
