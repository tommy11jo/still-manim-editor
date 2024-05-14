export const SIN_AND_COS_DEMO = `from smanim import *
n = NumberPlane.from_axes_ranges((-6, 6), (-2, 2), axis_config={"include_arrow_tips": False})
sin_graph_obj = n.plot(np.sin, color=RED)
derivative_fn = sin_graph_obj.gen_derivative_fn()
cos_graph_obj = n.plot(derivative_fn, color=BLUE)
sin_label = Text("y = sin(x)", color=RED, font_size=30).next_to(sin_graph_obj, UP)
sin_label.shift(RIGHT * 2)
cos_label = Text("y = cos(x)", color=BLUE, font_size=30).next_to(cos_graph_obj, UP)
cos_label.shift(LEFT * 0.6)
canvas.add(n, sin_label, cos_label)
canvas.draw()
`

export const LEMON_DEMO = `from smanim import *
stroke_width = 1
lemon = VGroup()
c = Circle(fill_color=YELLOW_D, stroke_color=WHITE, stroke_width=stroke_width)
c.stretch(1.4, dim=0).rotate(PI / 8)
arc = Arc(
    angle=-PI, fill_color=YELLOW_E, stroke_color=WHITE, stroke_width=stroke_width
)
arc.stretch(2, dim=1)
arc.stretch(1.4, dim=0).rotate(PI / 8)
lemon.add(c, arc)
lemon.bring_to_front(c)

spikes = VGroup()
for prop in range(8):
    line = Line(ORIGIN, c.point_from_proportion(prop / 8))
    spikes.add(line)
lemon.add(spikes)

other_lemon: VGroup = lemon.copy()
other_lemon.scale(0.8).shift(RIGHT * 0.5).rotate(-PI / 4)
lemon.shift(LEFT * 0.5)
other_lemon.shift(RIGHT * 0.8)
other_lemon.set_z_index(-10)

lemons = VGroup(lemon, other_lemon)
title = Text("Still Manim", font_size=H1_FONT_SIZE)
lemons.scale_to_fit_height(title.height)
title.next_to(lemons, buff=0.05)
canvas.add(lemons, title)

canvas.draw(crop=True)
`

export const IDRAW_SELECTION_DEMO = `from smanim import *
canvas = Canvas(CONFIG)
WIDTH, HEIGHT = 10, 25
PWIDTH = WIDTH / 2 - 1 # panel width
PBUFF = 0.5
canvas.set_dimensions(WIDTH, HEIGHT)

title = Text("(Coming Soon) Welcome to iDraw, a website for creating graphics with code and natural language commands", font_size=H2_FONT_SIZE)
title.align_to(canvas.top, edge=UP, buff=0.5)
canvas.add(title)

p1_label = Text("Let's see how selection works. First, make sure bidirectional editing is turned on by checking the box above the code editor. Then, hover over this tree with your mouse.", max_width=PWIDTH)
g = Graph(vertices=[0, 1, 2, 3, 4], edges=[(0, 1), (0, 2), (2, 3), (2, 4)], include_vertex_labels=True, layout='tree', root_vertex=0)
g.next_to(p1_label, DOWN).align_to(p1_label, LEFT)
panel1 = Group(p1_label, g).scale_to_fit_width(PWIDTH)


p2_label = Text("Try clicking to select just the tree, so that it looks like this. This should take three clicks.", max_width=PWIDTH)
g2 = g.copy().next_to(p2_label, DOWN, buff=0.3)
def add_selection_box(mob):
    mob.add_surrounding_rect(stroke_color=PURE_BLUE, stroke_width=2.0, z_index=10)
add_selection_box(g2)
panel2 = Group(g2, p2_label)

row1 = Group(panel1, panel2).arrange(buff=1.0)
row1.next_to(title, DOWN, buff=0.5).align_to(canvas.left, edge=LEFT, buff=PBUFF)
canvas.add(row1)

p3_label = Text("With the tree selected, you can also select its children components...", max_width=WIDTH - PBUFF * 2)
p3_1_label = Text("...like this edge...")
p3_1_label.next_to(p3_label, DOWN, buff=0.5).align_to(p3_label, edge=LEFT, buff=0.2)
g3 = g.copy()
g3.scale_to_fit_width(p3_1_label.width).next_to(p3_1_label, DOWN)
add_selection_box(g3.edges[(2, 3)])
p3_2_1_label = Text("...or these vertices.")
p3_2_1_label.next_to(p3_1_label, RIGHT, buff=1.0)
g4 = g.copy()
g4.scale_to_fit_width(g3.width).next_to(p3_2_1_label, DOWN)
add_selection_box(g4.vertices[2])
add_selection_box(g4.vertices[3])

arrow = Arrow.points_at(g4.vertices[3], direction=LEFT, length=0.5, buff=0.2)
t_arrow = Text("Use command + click (mac) or ctrl + click (windows) to select multiple items at once.", font_size=14, max_width=2.0)
t_arrow.next_to(arrow, RIGHT).align_to(arrow, edge=DOWN)
panel3 = Group(p3_label, p3_1_label, g3, p3_2_1_label, g4, arrow, t_arrow)
panel3.next_to(row1, DOWN, buff=PBUFF).align_to(panel1, edge=LEFT)
canvas.add(panel3)

p4_text = Text("And then you can enter a 'language command', rather than clicking through a typical UI.", max_width=WIDTH - PBUFF * 2)
p4_command = Text("> Make these two nodes red", italics=True)
g5 = g4.copy().scale_to_fit_width(g4.width).next_to(p4_command, DOWN)
box_el1 = Group(p4_command, g5)
p4_result = Text("Result")
g6 = g.copy().scale_to_fit_width(g5.width)
g6.vertices[2].set_color(RED)
g6.vertices[3].set_color(RED)
g6.next_to(p4_result, DOWN)
box_el2 = Group(p4_result, g6)
box_list = BoxList(box_el1, box_el2)

box_list.next_to(p4_text, DOWN, buff=0.5).align_to(p4_text, LEFT)
panel4 = Group(p4_text, box_list)
panel4.next_to(panel3, DOWN, buff=PBUFF).align_to(panel3, LEFT)
canvas.add(panel4)

p5_text = Text("At least that's the idea. Right now it's hard to get the LLM to do complex things but hopefully this will improve soon:", max_width=WIDTH - PBUFF * 2)
p5_text.next_to(panel4, DOWN, buff=PBUFF).align_to(panel4, LEFT)
canvas.add(p5_text)

p6_command = Text("> Make a graphic that explains selection in iDraw. Show a simple tree, like a graph with vertices and edges, and show what command click does.", italics=True, max_width=3.0)
p6_result = Text("Result")
graphic = Group(panel1.copy(), panel2.copy(), panel3.copy()).scale(0.4)
graphic.next_to(p6_result, DOWN)
result_group = Group(p6_result, graphic)
box_list = BoxList(p6_command, result_group)
box_list.next_to(p5_text, DOWN, buff=0.5).align_to(p5_text, LEFT)
canvas.add(box_list)
canvas.draw()`

export const SMANIM_INTRO = `from smanim import *
WIDTH, HEIGHT = 14, 42
PBUFF = 0.8
ROW_WIDTH = WIDTH - PBUFF * 2
canvas.set_dimensions(WIDTH, HEIGHT)

title = Text("Still Manim?", font_size=H1_FONT_SIZE).align_to(canvas.top, UP, buff=PBUFF)
canvas.add(title)

def gen_eye():
    blue_arc = Arc(start_angle=PI, angle=3 * PI / 2, stroke_color=BLUE, stroke_width=16)
    brown_arc = Arc(start_angle=PI / 2, angle=PI / 2, stroke_color=DARK_BROWN, stroke_width=16)
    eye = VGroup(blue_arc, brown_arc).scale(0.4)
    return eye
def gen_fading_eyes(rotate=False):
    eye = gen_eye()
    k = 6
    fading_eyes = VGroup(*[eye.copy().set_opacity(1 - (i - 1) / k).shift(LEFT * i * 0.7) for i in range(1, k + 1)])
    if rotate:
        fading_eyes.rotate(PI)
    return fading_eyes

def get_intro_row():
    row = Group()
    p1_text = Text("""The math animation library Manim is a surprisingly good option for creating static diagrams for math and programming concepts.
Created by 3blue1brown and used in his youtube videos, Manim can render animations of lines, number lines, cartesian graphs, plots on those graphs, and much more.""")
    fading_eyes = gen_fading_eyes()
    fading_eyes.next_to(p1_text, DOWN, buff=0.3)
    intro_p1 = Group(p1_text, fading_eyes)
    intro_p1.next_to(title, DOWN, buff=PBUFF).align_to(canvas.left, LEFT, buff=PBUFF)
    row.add(intro_p1)
    p2_text = Text("""When creating static graphics, what does Manim have that existing tools don't?
Why not use direct manipulators like Powerpoint or Figma; standard web dev tools like HTML and CSS; or programmatic tools like TikZ or Penrose?""")
    balance = Triangle().scale(0.3).stretch(0.5, dim=0)
    top_vertex = balance.vertices[0]
    start_line = Line(start=2 * LEFT, end=top_vertex)
    end_line = Line(start=top_vertex, end=top_vertex + start_line.get_direction() * start_line.length)
    manim_text = Text("Manim", color=BLUE).next_to(end_line.end, UP)
    existing_text = Text("Existing Solutions", color=RED).next_to(start_line.start, UP, buff=0.2)
    scale_obj = Group(balance, start_line, end_line)
    scale_obj.set_color(GOLD)
    scale_group = Group(scale_obj, manim_text, existing_text)
    scale_group.next_to(p2_text, DOWN, buff=0.3)
    p2 = Group(p2_text, scale_group)
    p2.next_to(intro_p1, RIGHT, UP)
    row.add(p2)
    return row
intro_row = get_intro_row()
canvas.add(intro_row)

def gen_features_row():
    p1_text = Text("""Two of Manim's core features are relative positioning commands and spatial transformations.
With relative positioning commands, you can place objects in relation to each other:""")
    box1 = Text("circle.next_to(square, RIGHT)")
    def gen_shapes():
        c = Circle(radius=0.3, color=RED, opacity=0.5)
        s = Square(side_length=1.0, color=BLUE, opacity=0.5)
        return c, s
    c1, s1 = gen_shapes()
    orig1 = VGroup(s1, c1)
    c2, s2 = gen_shapes()
    c2.next_to(s2, RIGHT)
    transformed1 = VGroup(c2, s2)
    transformed1.shift(RIGHT * (orig1.width + 1))
    arrow1 = Arrow(orig1, transformed1, buff=0.2)
    box1_graphic = VGroup(orig1, transformed1, arrow1)
    box1_graphic.next_to(box1, DOWN, buff=0.3)
    box1 = Group(box1, box1_graphic)

    box2_text = Text("circle.align_to(square, UP)")
    c3, s3 = gen_shapes()
    orig2 = VGroup(c3, s3)
    c4, s4 = gen_shapes()
    c4.align_to(s4, UP)
    transformed2 = VGroup(c4, s4)
    transformed2.shift(RIGHT * (orig2.width + 1))
    arrow2 = Arrow(orig2, transformed2, buff=0.2)
    box2_graphic = VGroup(orig2, transformed2, arrow2)
    box2_graphic.next_to(box2_text, DOWN, buff=0.3)
    box2 = Group(box2_text, box2_graphic)

    box3_text = Text("dot.move_to(triangle.vertices[0])")
    tri1 = Triangle(color=BLUE, opacity=0.5).scale(0.5)
    dot1 = Dot(color=RED, opacity=0.5)
    orig3 = VGroup(tri1, dot1)
    tri2 = tri1.copy()
    dot2 = dot1.copy()
    transformed3 = VGroup(tri2, dot2)
    dot2.move_to(tri2.vertices[0])
    transformed3.shift(RIGHT * (orig3.width + 1))
    arrow3 = Arrow(orig3, transformed3, buff=0.2)
    box3_graphic = VGroup(orig3, transformed3, arrow3)
    box3_graphic.next_to(box3_text, DOWN, buff=0.3)
    box3 = Group(box3_text, box3_graphic)

    p3_graphic = BoxList(box1, box2, box3, direction=DOWN, x_padding=0.3, y_padding=0.3, aligned_edge=ORIGIN)
    p3_graphic.next_to(p1_text, DOWN, buff=0.3)
    panel3 = Group(p1_text, p3_graphic)
    panel3.next_to(intro_row, DOWN, LEFT, buff=PBUFF)
    canvas.add(panel3)

    p2_text = Text("""And spatial transformations are used to change the object itself:""")
    box4_text = Text("rect.scale(2)")
    def get_rect():
        return Rectangle(width=1, height=0.5, color=RED, opacity=0.5)
    r1 = get_rect()
    r2 = get_rect().scale(2).next_to(r1, buff=1.0)
    arrow4 = Arrow(r1, r2, buff=0.1)
    box4_graphic = Group(r1, r2, arrow4)
    box4_graphic.next_to(box4_text, DOWN)
    box4 = Group(box4_text, box4_graphic)

    box5_text = Text("rect.stretch(2, dim=0)")
    r3 = get_rect()
    r4 = get_rect().stretch(2, dim=0).next_to(r3, buff=1.0)
    arrow2 = Arrow(r3, r4, buff=0.1)
    box5_graphic = Group(r3, r4, arrow2)
    box5_graphic.next_to(box5_text, DOWN)
    box5 = Group(box5_text, box5_graphic)

    box6_text = Text("rect.rotate(PI / 4)")
    r5 = get_rect()
    r6 = get_rect().rotate(PI / 4).next_to(r5, buff=1.0)
    arrow6 = Arrow(r5, r6, buff=0.1)
    box6_graphic = Group(r5, r6, arrow6)
    box6_graphic.next_to(box6_text, DOWN)
    box6 = Group(box6_text, box6_graphic)

    box7_text = Text("rect.shift(RIGHT)")
    r7 = get_rect()
    r8 = get_rect().shift(RIGHT * 2).next_to(r7, buff=2.0)
    arrow7 = arrow6.copy().next_to(r7, buff=0.1)
    box7_graphic = Group(r7, r8, arrow7)
    box7_graphic.next_to(box7_text, DOWN)
    box7 = Group(box7_text, box7_graphic)
    p2_graphic = BoxList(box4, box5, box6, box7, direction=DOWN, x_padding=0.3, y_padding=0.3, aligned_edge=ORIGIN)
    p2_graphic.next_to(p2_text, DOWN, buff=0.3)
    panel2 = Group(p2_text, p2_graphic)
    panel2.next_to(panel3, RIGHT).align_to(p1_text, UP)
    canvas.add(panel2)
    return Group(panel3, panel2)
feature_row = gen_features_row()

def gen_more_features_row():
    p1_text = Text("""Manim has programmatic analogs to many of the features in typical direct manipulation editors like Powerpoint and Figma.
Positioning, styling, layering, and grouping can all be achieved directly in code.
What might have existed in a right click menu or a button within a user interface exists in Manim as a function call.""")
    command_text = Text("shape_group.bring_to_front(circle)")
    c = Circle(color=RED).shift(0.5)
    s = Square()
    orig1 = Group(c, s)
    orig1.next_to(command_text, DOWN, LEFT)
    c2 = c.copy()
    s2 = s.copy()
    transformed1 = Group(c2, s2).next_to(orig1, buff=1.0)
    transformed1.bring_to_front(c2)
    arrow = Arrow(orig1, transformed1, buff=0.1)
    p1_graphic1 = Group(command_text, orig1, transformed1, arrow)
    p1_graphic1.scale(0.7).next_to(p1_text, DOWN)

    command2_text = Text("shape_group.set_color(GREEN)").next_to(p1_graphic1, DOWN, buff=0.2)
    c3 = Circle(color=RED).shift(0.5)
    s3 = Square()
    c4 = c3.copy()
    s4 = s3.copy()
    orig2 = Group(c3, s3).next_to(command2_text, DOWN, LEFT)
    transformed2 = Group(c4, s4).set_color(GREEN).next_to(orig2, buff=1.0)
    arrow2 = Arrow(orig2, transformed2, buff=0.1)
    p1_graphic2 = Group(command2_text, orig2, transformed2, arrow2)
    p1_graphic2.scale(0.7).next_to(p1_graphic1, DOWN)
    p1_graphic = Group(p1_graphic1, p1_graphic2)

    extra_note = Text("Note: the 'bring_to_front' syntax differs from Manim slightly. This is syntax for Still Manim.", font_size=12)
    extra_note.next_to(p1_graphic, DOWN, buff=0.3)
    p1 = Group(p1_text, p1_graphic, extra_note)

    p2_text = Text("""Despite having a lot of nice features for static graphics, Manim is designed for animations.
To render a character of text in Manim, the character is transformed to an svg which is transformed to a list of mobjects which store the underlying shape of the character as points that represent bezier curves so that a graphics library called cairo can finally draw the character.""")
    p2_graphic = Lambda().scale(3).next_to(p2_text, DOWN, buff=0.3)
    for point in p2_graphic.points:
        p2_graphic.add(Dot(point, radius=0.03, color=BLUE))

    p2_text_below = Text("""Pretty compute intensive for just text, take a look at all the dots for just a lambda character.
And wrapping text, like what you're reading now, isn't a standard capability.""")
    p2_text_below.next_to(p2_graphic, DOWN, buff=0.3)
    p2 = Group(p2_text, p2_text_below, p2_graphic)
    p2.next_to(p1, RIGHT, UP, buff=PBUFF)
    return Group(p1, p2)

more_features_row = gen_more_features_row()
more_features_row.next_to(feature_row, DOWN, LEFT, buff=PBUFF)
canvas.add(more_features_row)

def gen_smanim_intro_row():  
    def get_lemon_logo():
        stroke_width = 2
        lemon = VGroup()
        c = Circle(fill_color=YELLOW_D, stroke_color=WHITE, stroke_width=stroke_width)
        c.stretch(1.4, dim=0).rotate(PI / 8)
        arc = Arc(
            angle=-PI, fill_color=YELLOW_E, stroke_color=WHITE, stroke_width=stroke_width
        )
        arc.stretch(2, dim=1)
        arc.stretch(1.4, dim=0).rotate(PI / 8)
        lemon.add(c, arc)
        lemon.bring_to_front(c)

        spikes = VGroup()
        for prop in range(8):
            line = Line(ORIGIN, c.point_from_proportion(prop / 8))
            spikes.add(line)
        lemon.add(spikes)

        other_lemon: VGroup = lemon.copy()
        other_lemon.scale(0.8).shift(RIGHT * 0.5).rotate(-PI / 4)
        lemon.shift(LEFT * 0.5)
        other_lemon.shift(RIGHT * 0.8)
        other_lemon.set_z_index(-10)

        lemons = VGroup(lemon, other_lemon)
        lemons = VGroup(lemon, other_lemon)
        title = Text("Still Manim", font_size=H1_FONT_SIZE)
        lemons.scale_to_fit_height(title.height)
        title.next_to(lemons, buff=0.05)
        return Group(title, lemons)
    p1_text = Text("""So, I built Still Manim, a variant of Manim that is designed for *still* pictures rather than animations.
Still Manim is a python library for drawing static graphics of conceptual content in domains like math and programming.
It's *still* Manim in that it has a lot of the same user-facing abstractions as the original Manim.
But Still Manim handles text differently, outputs SVGs rather than PNGs, and can run in the browser.""", max_width=ROW_WIDTH)
    p1_graphic = get_lemon_logo().scale(2).next_to(p1_text, DOWN, buff=0.3)
    p1 = Group(p1_text, p1_graphic)
    return p1

smanim_row = gen_smanim_intro_row()
smanim_row.next_to(more_features_row, DOWN, LEFT, buff=PBUFF)
canvas.add(smanim_row)

def gen_complex_examples_row(): 
    p1_text = Text("""Still Manim is a new codebase so it's missing a lot of the objects and functions in the original Manim, but you can still draw some complex mobjects.
For example, you can draw a 2D cartesian plane with a vector or a weighted graph or the comic that you're reading now!""", max_width=ROW_WIDTH)
    cartesian = NumberPlane.from_axes_ranges([-2, 2, 1], [-1, 3, 1], x_length=8, y_length=8, fill_canvas=False)
    cartesian.scale(0.6).next_to(p1_text, DOWN, LEFT)
    vector = Arrow(cartesian.coords_to_point(0, 0), cartesian.coords_to_point(1, 2))
    cartesian.add(vector)

    graph = Graph(vertices=[0, 1, 2, 3, 4], edges=[(0, 1), (0, 2), (0, 3), (1, 3), (2, 3), (2, 4), (3, 4)], include_vertex_labels=True, layout_config={"seed": 0})
    graph.next_to(cartesian, RIGHT, UP)

    p1_subpanel_text = Text("""And since these are native objects, they can be positioned relatively, transformed spatially, labeled, styled, layered, or grouped.""", max_width=ROW_WIDTH / 3)
    p1_subpanel_text.next_to(graph, RIGHT, UP)
    graph2 = graph.copy().scale(0.5).rotate(PI / 2).next_to(p1_subpanel_text, DOWN, LEFT).shift(RIGHT * 0.3)
    vertex_arrow = Arrow.points_at(graph2.vertices[2], direction=LEFT, length=0.5, color=RED)
    start_text = Text("You are here", font_size=16, color=RED).next_to(vertex_arrow, RIGHT)
    p1 = Group(p1_text, cartesian, graph, p1_subpanel_text, graph2, vertex_arrow, start_text)
    p1.next_to(smanim_row, DOWN, LEFT, buff=PBUFF)
    return p1

complex_examples_row = gen_complex_examples_row()
canvas.add(complex_examples_row)

def gen_towards_llm_row():
    p1_text = Text("""Today, these graphics take a lot of time to create.
I've used about 250 lines of code to create everything up until the text you're reading now.
But a neat property of Still Manim code is that it can be authored somewhat reliably without seeing the diagram it constructs.""")
    fading_eyes2 = gen_fading_eyes(rotate=True)
    fading_eyes2.next_to(p1_text, DOWN, buff=0.3)
    p1 = Group(p1_text, fading_eyes2)
    canvas.add(p1)
    p2_text = Text("""Now what sort of programmer would need to create a graphic without seeing it?
And who would be willing to do the tedious work to produce good style and layout?""")
    question_text = Text("?", font_size=80).next_to(p2_text, DOWN)
    answer_text = Text("""Answer: A large language model. Still Manim could act as a (one-way) whiteboard for LLM tutors in the near future.""")
    answer_text.next_to(question_text, DOWN).align_to(p2_text, LEFT)
    p2 = Group(p2_text, question_text, answer_text)
    p2.next_to(p1, RIGHT, UP, buff=PBUFF)
    canvas.add(p2)
    row4 = Group(p1, p2)
    return row4

towards_llm_row = gen_towards_llm_row()
towards_llm_row.next_to(complex_examples_row, DOWN, LEFT, buff=PBUFF)
canvas.add(towards_llm_row)

def gen_future_goals_row():
    p1_text = Text("""
Right now, I'm interested in using LLMs as an assistant to help a human user incrementally edit diagrams.
The plan is for the user to optionally point at objects on the diagram and describe a change to the diagram in words and for the LLM to edit the code that constructs the diagram.
So far, I've built a web editor for writing Still Manim code, a website called iDraw (at idraw.chat).
Next, I'll experiment with using LLMs to edit code written in Still Manim.
Stay tuned.""", max_width=ROW_WIDTH)
    robot = Text("🤖").scale(2).rotate_in_place(PI / 2)
    robot2 = robot.copy().scale(2).rotate_in_place(-PI / 4)
    robot3 = robot.copy().scale(4).rotate_in_place(-PI / 2)
    robot_group = Group(robot, robot2, robot3).arrange().next_to(p1_text, DOWN, buff=0.5)
    return Group(p1_text, robot_group)

future_goals_row = gen_future_goals_row()
future_goals_row.next_to(towards_llm_row, DOWN, LEFT, buff=PBUFF)
canvas.add(future_goals_row)
canvas.draw()
`

export const GRAPH_DEMO = `
from smanim import *
canvas.set_dimensions(6, 6)
WEIGHTED_GRAPH1 = {
    0: [(1, 2), (2, 1)],
    1: [(2, 5), (3, 11), (4, 3)],
    2: [(5, 15)],
    3: [(4, 2)],
    4: [(2, 1), (5, 4), (6, 5)],
    5: [],
    6: [(3, 1), (5, 1)],
}
vertices, edges, edge_labels = WeightedGraph.from_adjacency_list(WEIGHTED_GRAPH1)
graph = WeightedGraph(
        vertices,
        edges,
        vertex_config={"fill_color": GRAY, "radius": 0.2},
        edge_labels=edge_labels,
        edge_type=Arrow,
        layout_config={"seed": 2},
        include_vertex_labels=True,
    )
start_vertex = graph.vertices[0]
start_vertex.set_color(RED)
pointer = Arrow.points_at(start_vertex, direction=LEFT, color=RED, length=0.5)
start_text = Text("start", color=RED).next_to(pointer)
canvas.add(graph, pointer, start_text)
canvas.draw()
`
