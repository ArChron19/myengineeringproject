document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('toggleSidebar');
    const content = document.getElementById('content');

    function expand() {
        sidebar.classList.add('expanded');
        content.classList.remove('collapsed');
    }

    function collapse() {
        sidebar.classList.remove('expanded');
        content.classList.add('collapsed');
    }

    toggle.addEventListener('click', () => {
        if (sidebar.classList.contains('expanded')) collapse();
        else expand();
    });

    sidebar.addEventListener('mouseenter', expand);
    sidebar.addEventListener('mouseleave', collapse);

    // collapse when clicking outside (useful on mobile/touch)
    document.addEventListener('click', (event) => {
        if (
            sidebar.classList.contains('expanded') &&
            !sidebar.contains(event.target) &&
            !toggle.contains(event.target)
        ) {
            collapse();
        }
    });

    // initialize collapsed state
    collapse();
});