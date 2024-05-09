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

export const DIJKSTRA_DEMO = `# Improve this to be like programcomics.com
from smanim import *
from typing import Hashable, Tuple
WEIGHTED_GRAPH1 = {
    0: [(1, 2), (2, 1)],
    1: [(2, 5), (3, 11), (4, 3)],
    2: [(5, 15)],
    3: [(4, 2)],
    4: [(2, 1), (5, 4), (6, 5)],
    5: [],
    6: [(3, 1), (5, 1)],
}
graph = WEIGHTED_GRAPH1
vertices, edges, edge_labels = WeightedGraph.from_adjacency_list(graph)
graph = WeightedGraph(
  vertices, 
  edges,
  include_vertex_labels=True,
  edge_labels=edge_labels,
  edge_type=Arrow,
  vertex_config={"fill_color": GREEN, "fill_opacity": 0.4, "radius": 0.2},
  edge_config={"opacity": 0.5},
  layout_config={"seed": 2}
)
graph.scale(1.5)
canvas.add(graph)


start = graph.vertices[0]
start.set_color(BLUE, family=False)
start_label = Text("start")
start_label.next_to(start, buff=SMALL_BUFF)
canvas.add(start_label)

graph.vertices[2].set_color(BLUE, family=False)
two_dist = Text("1", color=RED).next_to(graph.vertices[2], LEFT, buff=SMALL_BUFF)
five_dist = Text("16", color=RED).next_to(graph.vertices[5], LEFT, buff=SMALL_BUFF)
canvas.add(two_dist, five_dist)

visited_edges = Group(graph.edges[(0, 2)], graph.edges[(0, 1)])
visited_edges.set_color(GREEN)
visited_edges.set_opacity(0.4)

cur_node = graph.vertices[1].set_color(RED, family=False).set_opacity(1.0, family=False)
relaxed_edges = Group(graph.edges[(1, 2)], graph.edges[(1, 4)], graph.edges[(1, 3)])
relaxed_edges.set_color(RED).set_opacity(1.0)
relaxed_edges[0].set_opacity(0.5)

four_dist = Text("5", color=RED).next_to(graph.vertices[4], UP, buff=SMALL_BUFF)
four_dist.add_surrounding_rect(stroke_color=RED)
canvas.add(four_dist)
three_dist = Text("13", color=RED).next_to(graph.vertices[3], UP, buff=SMALL_BUFF)
three_dist.add_surrounding_rect(stroke_color=RED)
canvas.add(three_dist)

title = Text("Relaxing Edges in Dijkstra's", font_size=H1_FONT_SIZE)
title.next_to(graph, UP).shift(UP * 0.2 + RIGHT * 0.4)
canvas.add(title)

desc = Group()
blue_dot = Dot(fill_color=BLUE, fill_opacity=0.4)
legend = Text("Legend").next_to(graph, buff=0.6)
blue_dot.next_to(legend, DOWN).align_to(legend, LEFT)
blue_text = Text("Already visited").next_to(blue_dot)
red_dot = Dot(fill_color=RED).next_to(blue_dot, DOWN)
red_text = Text("Currently visiting").next_to(red_dot)
desc.add(legend, blue_dot, blue_text, red_dot, red_text)
canvas.add(desc)

canvas.draw(crop=True)
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
    vector = Vector(c.point_from_proportion(prop / 8))
    spikes.add(vector)
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

title = Text("Welcome to iDraw, a website for creating graphics with code and natural language commands", font_size=H2_FONT_SIZE)
title.align_to(canvas.top, edge=UP, buff=0.5)
canvas.add(title)

p1_label = Text("Let's see how selection works. Hover over this tree with your mouse.", max_width=PWIDTH)
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
